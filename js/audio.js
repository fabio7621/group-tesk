// 全部用 Web Audio 即時合成，不需要音檔。瀏覽器規定要等使用者第一次互動後才能出聲，所以由 unlock() 啟動
const humLevels = { room: 0.5, fridge: 0.8, open: 1.2 };
const soundStorageKey = 'fridge-sound-settings';
const defaultSoundSettings = { muted: false, hum: 0.6, sfx: 0.8 };

function clampVolume(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
}

// localStorage 的內容不可信（可能被改過或是舊格式），逐欄驗證後才使用
function readSoundSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(soundStorageKey)) || {};
    return {
      muted: stored.muted === true,
      hum: clampVolume(stored.hum, defaultSoundSettings.hum),
      sfx: clampVolume(stored.sfx, defaultSoundSettings.sfx)
    };
  } catch {
    return { ...defaultSoundSettings };
  }
}

function saveSoundSettings(settings) {
  try {
    localStorage.setItem(soundStorageKey, JSON.stringify(settings));
  } catch {
    // 無痕模式等情況存不了，就只在這次有效
  }
}

function createFridgeAudio() {
  let context = null;
  let master = null;
  let sfxBus = null;
  let hum = null;
  let noiseBuffer = null;
  let view = appState.view;
  let settings = readSoundSettings();

  // 布朗噪音：比白噪音低沉柔和，像冰箱風扇的氣流聲
  function createNoiseBuffer(seconds) {
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  function createNoiseSource() {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    return source;
  }

  function startHum() {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(master);

    // 壓縮機的電源嗡聲（60Hz 的倍頻，筆電喇叭才聽得到）
    [[60, 0.35], [120, 0.5], [180, 0.15], [240, 0.08]].forEach(([frequency, amount]) => {
      const oscillator = context.createOscillator();
      const oscillatorGain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillatorGain.gain.value = amount * 0.12;
      oscillator.connect(oscillatorGain).connect(gain);
      oscillator.start();
    });

    const noise = createNoiseSource();
    noise.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    noise.connect(filter).connect(gain);
    noise.start();

    // 很慢的起伏，聽起來比較像真的機器而不是固定音
    const wobble = context.createOscillator();
    const wobbleDepth = context.createGain();
    wobble.frequency.value = 0.15;
    wobbleDepth.gain.value = 120;
    wobble.connect(wobbleDepth).connect(filter.frequency);
    wobble.start();

    return { gain, filter };
  }

  function applyView() {
    if (!hum) return;
    const now = context.currentTime;
    hum.gain.gain.setTargetAtTime(humLevels[view] * 0.15 * settings.hum, now, 0.3);
    hum.filter.frequency.setTargetAtTime(view === 'open' ? 1100 : 500, now, 0.4);
  }

  function playEnvelope(node, peak, attack, decay, when) {
    node.gain.setValueAtTime(0, when);
    node.gain.linearRampToValueAtTime(peak, when + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }

  function playThump(when, fromFrequency, toFrequency, peak, decay) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(fromFrequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(toFrequency, when + decay);
    playEnvelope(gain, peak, 0.005, decay, when);
    oscillator.connect(gain).connect(sfxBus);
    oscillator.start(when);
    oscillator.stop(when + decay + 0.05);
  }

  function playNoiseBurst(when, filterType, frequency, peak, decay) {
    const noise = createNoiseSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    playEnvelope(gain, peak, 0.01, decay, when);
    noise.connect(filter).connect(gain).connect(sfxBus);
    noise.start(when);
    noise.stop(when + decay + 0.05);
  }

  const sounds = {
    // 密封條被拉開的「啵」＋一陣冷空氣
    open(now) {
      playThump(now, 110, 55, 0.7, 0.18);
      playNoiseBurst(now, 'bandpass', 1400, 1.4, 0.22);
      playNoiseBurst(now + 0.08, 'lowpass', 900, 0.8, 0.9);
    },
    // 門撞上的悶響＋磁條吸住的短促聲
    close(now) {
      playThump(now, 90, 38, 0.6, 0.3);
      playNoiseBurst(now, 'lowpass', 700, 0.5, 0.1);
      playThump(now + 0.06, 160, 70, 0.2, 0.1);
    },
    // 門拉不開，被磁條拉回去的輕微卡卡聲
    rattle(now) {
      [0, 0.08, 0.16].forEach((delay, index) => {
        playThump(now + delay, 130, 70, 0.25 - index * 0.06, 0.08);
        playNoiseBurst(now + delay, 'bandpass', 900, 0.15 - index * 0.04, 0.05);
      });
    }
  };

  return {
    unlock() {
      if (context) {
        if (context.state === 'suspended') context.resume();
        return;
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      context = new AudioContextClass();
      noiseBuffer = createNoiseBuffer(4);
      master = context.createGain();
      master.gain.value = settings.muted ? 0 : 1;
      master.connect(context.destination);
      sfxBus = context.createGain();
      sfxBus.gain.value = settings.sfx * 1.25;
      sfxBus.connect(master);
      hum = startHum();
      applyView();
    },

    setView(nextView) {
      view = nextView;
      applyView();
    },

    play(name) {
      if (!context || settings.muted || settings.sfx === 0) return;
      sounds[name](context.currentTime + 0.01);
    },

    getSettings() {
      return { ...settings };
    },

    setMuted(muted) {
      settings = { ...settings, muted };
      saveSoundSettings(settings);
      if (master) master.gain.setTargetAtTime(muted ? 0 : 1, context.currentTime, 0.1);
    },

    // channel 是 'hum'（白噪音）或 'sfx'（開關門音效），value 為 0–1
    setVolume(channel, value) {
      settings = { ...settings, [channel]: clampVolume(value, settings[channel]) };
      saveSoundSettings(settings);
      if (!context) return;
      if (channel === 'hum') applyView();
      else sfxBus.gain.setTargetAtTime(settings.sfx * 1.25, context.currentTime, 0.05);
    }
  };
}

// 右下角的聲音面板：總開關、白噪音音量、開關門音效音量
function renderSoundControls(elements, settings) {
  const humPercent = Math.round(settings.hum * 100);
  const sfxPercent = Math.round(settings.sfx * 100);

  elements.toggleButton.textContent = settings.muted ? '🔇 聲音' : `🔊 ${humPercent}%`;
  elements.toggleButton.setAttribute('aria-label', settings.muted ? '聲音設定（目前靜音）' : `聲音設定（白噪音 ${humPercent}%）`);
  elements.enabled.checked = !settings.muted;
  elements.humSlider.value = humPercent;
  elements.humValue.textContent = `${humPercent}%`;
  elements.sfxSlider.value = sfxPercent;
  elements.sfxValue.textContent = `${sfxPercent}%`;
  elements.panel.classList.toggle('is-muted', settings.muted);
}

function setSoundPanelOpen(elements, open) {
  elements.panel.hidden = !open;
  elements.toggleButton.setAttribute('aria-expanded', String(open));
}

function addSoundControls(ui) {
  const { audio } = ui;
  const elements = {
    toggleButton: document.getElementById('sound'),
    panel: document.getElementById('sound-panel'),
    enabled: document.getElementById('sound-enabled'),
    humSlider: document.getElementById('hum-volume'),
    humValue: document.getElementById('hum-value'),
    sfxSlider: document.getElementById('sfx-volume'),
    sfxValue: document.getElementById('sfx-value')
  };
  const render = () => renderSoundControls(elements, audio.getSettings());

  // 瀏覽器要等使用者互動後才允許出聲
  const unlock = () => audio.unlock();
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);

  elements.toggleButton.addEventListener('click', () => {
    setSoundPanelOpen(elements, elements.panel.hidden);
  });

  elements.enabled.addEventListener('change', () => {
    audio.setMuted(!elements.enabled.checked);
    render();
  });

  elements.humSlider.addEventListener('input', () => {
    audio.setVolume('hum', elements.humSlider.value / 100);
    render();
  });

  elements.sfxSlider.addEventListener('input', () => {
    audio.setVolume('sfx', elements.sfxSlider.value / 100);
    render();
  });
  // 放開滑桿時播一次關門聲，讓使用者聽到調整後的音量
  elements.sfxSlider.addEventListener('change', () => audio.play('close'));

  addEventListener('pointerdown', event => {
    if (elements.panel.hidden) return;
    if (elements.panel.contains(event.target) || elements.toggleButton.contains(event.target)) return;
    setSoundPanelOpen(elements, false);
  });

  // capture 階段先攔 Escape：面板開著時只關面板，不觸發「回上一步」
  addEventListener('keydown', event => {
    if (event.key !== 'Escape' || elements.panel.hidden) return;
    event.stopPropagation();
    setSoundPanelOpen(elements, false);
    elements.toggleButton.focus();
  }, true);

  render();
}

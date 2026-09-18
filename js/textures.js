function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function toTexture(canvas, repeatX, repeatY) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 4;
  if (repeatX) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
  }
  return texture;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

// 用 shadowBlur 畫模糊色塊：形狀畫在畫布外，只留下影子，所有瀏覽器都支援
function drawBlurredRect(context, x, y, width, height, blur, color) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = blur;
  context.shadowOffsetX = 10000;
  context.fillRect(x - 10000, y, width, height);
  context.restore();
}

function createFloorTileTexture() {
  const [canvas, context] = createCanvas(256, 256);
  const tile = 64;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      context.fillStyle = (row + col) % 2 ? '#2a2d33' : '#44474d';
      context.fillRect(col * tile, row * tile, tile, tile);
    }
  }
  context.strokeStyle = 'rgba(10,10,12,.7)';
  context.lineWidth = 2;
  for (let i = 0; i <= 256; i += tile) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, 256);
    context.moveTo(0, i);
    context.lineTo(256, i);
    context.stroke();
  }
  return toTexture(canvas, 16, 16);
}

function createWallPaintTexture() {
  const [canvas, context] = createCanvas(256, 256);
  context.fillStyle = '#39414f';
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    context.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},.035)`;
    context.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  return toTexture(canvas, 12, 3);
}

function createSubwayTileTexture(repeatX) {
  const [canvas, context] = createCanvas(256, 128);
  context.fillStyle = '#5f666d';
  context.fillRect(0, 0, 256, 128);
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 ? -32 : 0;
    for (let x = offset; x < 256; x += 64) {
      context.fillStyle = '#a9b0b6';
      drawRoundedRect(context, x + 2, row * 32 + 2, 60, 28, 4);
      context.fill();
    }
  }
  return toTexture(canvas, repeatX, 1);
}

function createStoveClockTexture() {
  const [canvas, context] = createCanvas(128, 48);
  context.fillStyle = '#050607';
  context.fillRect(0, 0, 128, 48);
  context.fillStyle = '#7dffb0';
  context.shadowColor = '#7dffb0';
  context.shadowBlur = 8;
  context.font = '700 30px "Courier New", monospace';
  context.textAlign = 'center';
  context.fillText('02:14', 64, 35);
  return toTexture(canvas);
}

function createNightSkyTexture() {
  const [canvas, context] = createCanvas(256, 288);
  const sky = context.createLinearGradient(0, 0, 0, 288);
  sky.addColorStop(0, '#0a1430');
  sky.addColorStop(.7, '#1d3261');
  sky.addColorStop(1, '#3a4f7e');
  context.fillStyle = sky;
  context.fillRect(0, 0, 256, 288);

  for (let i = 0; i < 70; i++) {
    context.fillStyle = `rgba(255,255,240,${randomBetween(.3, .95)})`;
    context.fillRect(Math.random() * 256, Math.random() * 200, randomBetween(1, 2.4), randomBetween(1, 2.4));
  }

  const glow = context.createRadialGradient(182, 70, 10, 182, 70, 70);
  glow.addColorStop(0, 'rgba(255,244,210,.55)');
  glow.addColorStop(1, 'rgba(255,244,210,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 256, 288);
  context.fillStyle = '#fff6da';
  context.beginPath();
  context.arc(182, 70, 20, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#0b1224';
  context.beginPath();
  context.moveTo(0, 288);
  [[0, 230], [40, 214], [70, 236], [120, 200], [165, 228], [210, 206], [256, 224], [256, 288]]
    .forEach(([x, y]) => context.lineTo(x, y));
  context.fill();

  return toTexture(canvas);
}

function createSoftDotTexture(rgb) {
  const [canvas, context] = createCanvas(128, 128);
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, `rgba(${rgb},1)`);
  gradient.addColorStop(.35, `rgba(${rgb},.45)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createRadialLightTexture() {
  return createSoftDotTexture('143,220,255');
}

function createSoftShadowTexture() {
  const [canvas, context] = createCanvas(128, 128);
  drawBlurredRect(context, 18, 18, 92, 92, 14, 'rgba(0,0,0,.55)');
  return new THREE.CanvasTexture(canvas);
}

// 金屬與琺瑯的反射來源：上亮下暗，加一盞暖燈與一扇冷色窗
// 金屬與琺瑯的反射來源：昏暗的廚房，只有一側冷色的冰箱光和一扇窗
function createEnvironmentTexture() {
  const [canvas, context] = createCanvas(512, 256);
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#5d6a86');
  gradient.addColorStop(.5, '#1f2533');
  gradient.addColorStop(1, '#0a0c10');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  drawBlurredRect(context, 90, 70, 50, 110, 20, 'rgba(143,220,255,.9)');
  drawBlurredRect(context, 330, 60, 60, 70, 16, 'rgba(160,185,235,.7)');

  const texture = toTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function createLinerTexture() {
  const [canvas, context] = createCanvas(128, 256);
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#cfe6f2');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 256);
  context.fillStyle = 'rgba(120,160,190,.12)';
  for (let x = 8; x < 128; x += 16) context.fillRect(x, 0, 2, 256);
  return toTexture(canvas);
}

function createClockFaceTexture() {
  const [canvas, context] = createCanvas(256, 256);
  context.fillStyle = '#f4ead6';
  context.beginPath();
  context.arc(128, 128, 128, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#3b2f28';
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const long = i % 3 === 0;
    context.save();
    context.translate(128, 128);
    context.rotate(angle);
    context.fillRect(-(long ? 3 : 1.5), -118, long ? 6 : 3, long ? 20 : 12);
    context.restore();
  }

  context.font = '700 30px "LXGW WenKai TC", serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  [['12', 128, 50], ['3', 206, 128], ['6', 128, 206], ['9', 50, 128]]
    .forEach(([label, x, y]) => context.fillText(label, x, y));

  return toTexture(canvas);
}

function createKidDrawingTexture() {
  const [canvas, context] = createCanvas(256, 200);
  context.fillStyle = '#fbfaf4';
  context.fillRect(0, 0, 256, 200);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 5;

  context.strokeStyle = '#f2b632';
  context.beginPath();
  context.arc(212, 42, 20, 0, Math.PI * 2);
  context.stroke();
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    context.beginPath();
    context.moveTo(212 + Math.cos(angle) * 28, 42 + Math.sin(angle) * 28);
    context.lineTo(212 + Math.cos(angle) * 38, 42 + Math.sin(angle) * 38);
    context.stroke();
  }

  context.strokeStyle = '#d9483b';
  context.beginPath();
  context.moveTo(40, 100);
  context.lineTo(90, 58);
  context.lineTo(140, 100);
  context.stroke();
  context.strokeStyle = '#3b6fd9';
  context.strokeRect(50, 100, 80, 64);
  context.strokeRect(80, 130, 20, 34);

  context.strokeStyle = '#2f9e5b';
  [170, 206].forEach(x => {
    context.beginPath();
    context.arc(x, 110, 10, 0, Math.PI * 2);
    context.moveTo(x, 120);
    context.lineTo(x, 146);
    context.moveTo(x - 14, 130);
    context.lineTo(x + 14, 130);
    context.moveTo(x - 10, 164);
    context.lineTo(x, 146);
    context.lineTo(x + 10, 164);
    context.stroke();
  });

  context.fillStyle = '#7a4fc2';
  context.font = '700 24px "LXGW WenKai TC", serif';
  context.fillText('我們家', 18, 190);
  return toTexture(canvas);
}

function createPhotoTexture() {
  const [canvas, context] = createCanvas(200, 240);
  context.fillStyle = '#fbfbf7';
  context.fillRect(0, 0, 200, 240);

  const sky = context.createLinearGradient(0, 14, 0, 180);
  sky.addColorStop(0, '#f6a36b');
  sky.addColorStop(1, '#f7d98b');
  context.fillStyle = sky;
  context.fillRect(14, 14, 172, 166);

  context.fillStyle = '#fff3c4';
  context.beginPath();
  context.arc(130, 110, 22, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#5b5f8f';
  context.beginPath();
  context.moveTo(14, 180);
  context.lineTo(70, 96);
  context.lineTo(118, 150);
  context.lineTo(150, 118);
  context.lineTo(186, 160);
  context.lineTo(186, 180);
  context.fill();

  context.fillStyle = '#5a5046';
  context.font = '20px "LXGW WenKai TC", serif';
  context.fillText('墾丁 2025', 22, 216);
  return toTexture(canvas);
}

function createBadgeTexture() {
  const [canvas, context] = createCanvas(512, 128);
  const plate = context.createLinearGradient(0, 0, 0, 128);
  plate.addColorStop(0, '#f4f7fa');
  plate.addColorStop(.5, '#8d969e');
  plate.addColorStop(1, '#e3e8ec');
  context.fillStyle = plate;
  drawRoundedRect(context, 4, 14, 504, 100, 50);
  context.fill();

  context.fillStyle = '#2d3a40';
  context.font = 'italic 700 64px Georgia, "Times New Roman", serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Frostline', 256, 66);
  return toTexture(canvas);
}

function createGiftTagTexture(name, points, accent) {
  const [canvas, context] = createCanvas(256, 192);
  context.fillStyle = '#fff9ec';
  drawRoundedRect(context, 6, 6, 244, 180, 22);
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 5;
  drawRoundedRect(context, 16, 16, 224, 160, 16);
  context.stroke();

  context.fillStyle = '#d9cdb5';
  context.beginPath();
  context.arc(128, 36, 8, 0, Math.PI * 2);
  context.fill();

  context.textAlign = 'center';
  context.fillStyle = '#2b2620';
  context.font = '700 48px "LXGW WenKai TC", "Kaiti TC", serif';
  context.fillText(name, 128, 104);
  context.fillStyle = accent;
  context.font = '700 34px "Noto Sans TC", sans-serif';
  context.fillText(`${points} 點`, 128, 152);

  return toTexture(canvas);
}

function drawTaskNote(task) {
  const [canvas, context] = createCanvas(512, 512);
  context.scale(2, 2);

  const paper = context.createLinearGradient(0, 0, 0, 256);
  paper.addColorStop(0, task.color);
  paper.addColorStop(1, shadeColor(task.color, -.1));
  context.fillStyle = paper;
  context.fillRect(0, 0, 256, 256);
  context.fillStyle = 'rgba(0,0,0,.06)';
  context.fillRect(0, 0, 256, 44);
  context.fillStyle = 'rgba(0,0,0,.1)';
  context.fillRect(0, 246, 256, 10);

  const magnet = context.createRadialGradient(123, 21, 2, 128, 26, 16);
  magnet.addColorStop(0, '#ff9b8f');
  magnet.addColorStop(1, '#c0392b');
  context.fillStyle = 'rgba(0,0,0,.2)';
  context.beginPath();
  context.arc(130, 30, 15, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = magnet;
  context.beginPath();
  context.arc(128, 26, 15, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#2b2620';
  context.textAlign = 'center';
  context.font = '700 44px "LXGW WenKai TC", "Kaiti TC", serif';
  context.fillText(task.title, 128, 120);
  context.font = '26px "Noto Sans TC", sans-serif';
  context.globalAlpha = .72;
  context.fillText(`${task.by}發布，${task.points} 點`, 128, 170);
  context.globalAlpha = 1;

  if (task.done) {
    context.fillStyle = 'rgba(120,120,120,.3)';
    context.fillRect(0, 0, 256, 256);
    context.save();
    context.translate(185, 215);
    context.rotate(-0.24);
    context.strokeStyle = '#c0392b';
    context.lineWidth = 5;
    context.strokeRect(-52, -26, 104, 52);
    context.fillStyle = '#c0392b';
    context.font = '700 38px "LXGW WenKai TC", serif';
    context.fillText('完成', 0, 13);
    context.restore();
  }

  return canvas;
}

function shadeColor(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channel = shift => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * (1 + amount))));
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

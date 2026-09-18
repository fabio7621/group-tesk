const kitchenWindow = { x: 2.4, y: 1.64, width: 0.8, height: 0.72 };

function addWindow(scene) {
  const { x: centerX, y: centerY, width, height } = kitchenWindow;
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xbfb8aa, roughness: .6 });

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: createNightSkyTexture(), color: 0x9aa6c0 }));
  glass.position.set(centerX, centerY, 0.008);
  scene.add(glass);

  [
    [width + 0.1, 0.05, 0.06, 0, height / 2 + 0.025],
    [width + 0.1, 0.05, 0.06, 0, -height / 2 - 0.025],
    [0.05, height, 0.06, width / 2 + 0.025, 0],
    [0.05, height, 0.06, -width / 2 - 0.025, 0],
    [0.03, height, 0.04, 0, 0],
    [width + 0.16, 0.03, 0.1, 0, -height / 2 - 0.06]
  ].forEach(([w, h, d, x, y]) => addBox(scene, frameMaterial, [w, h, d], [centerX + x, centerY + y, d / 2]));
}

function addClock(scene, materials) {
  const clock = new THREE.Group();
  clock.position.set(1.05, 1.95, 0.02);
  scene.add(clock);

  const face = new THREE.Mesh(new THREE.CircleGeometry(0.16, 48), new THREE.MeshStandardMaterial({ map: createClockFaceTexture(), roughness: .7 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.016, 12, 48), materials.chrome);
  rim.castShadow = true;
  clock.add(face, rim);

  function createHand(width, length, color) {
    const geometry = new THREE.BoxGeometry(width, length, 0.004);
    geometry.translate(0, length / 2 - 0.02, 0);
    const hand = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: .5 }));
    clock.add(hand);
    return hand;
  }

  const hands = {
    hour: createHand(0.012, 0.09, 0x2b2320),
    minute: createHand(0.008, 0.13, 0x2b2320),
    second: createHand(0.003, 0.14, 0xd9483b)
  };
  hands.hour.position.z = 0.004;
  hands.minute.position.z = 0.008;
  hands.second.position.z = 0.012;
  return hands;
}

function addMagnet(scene, color, y, z) {
  const magnet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.012, 20),
    new THREE.MeshStandardMaterial({ color, roughness: .35 })
  );
  magnet.rotation.z = Math.PI / 2;
  magnet.position.set(fridgeSize.d + fridgeDoorThickness + 0.008, y, z);
  magnet.castShadow = true;
  scene.add(magnet);
}

function addPinnedPaper(scene, texture, width, height, y, z, tilt, magnetColor) {
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: .9 }));
  paper.rotation.set(0, Math.PI / 2, tilt);
  paper.position.set(fridgeSize.d + fridgeDoorThickness + 0.002, y, z);
  scene.add(paper);
  addMagnet(scene, magnetColor, y + height / 2 - 0.02, z);
}

function addLowerDoorDecorations(scene) {
  addPinnedPaper(scene, createKidDrawingTexture(), 0.24, 0.19, 0.84, 0.47, 0.05, 0x4d9de0);
  addPinnedPaper(scene, createPhotoTexture(), 0.12, 0.145, 0.52, 0.74, -0.08, 0xf2c94c);
  addMagnet(scene, 0xe8554e, 0.36, 0.42);
  addMagnet(scene, 0x56c28a, 0.4, 0.5);
}

function createDust(scene) {
  const count = 90;
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // 只撒在冰箱冷光照得到的範圍，像光束裡的灰塵
    base[i * 3] = randomBetween(0.75, 1.7);
    base[i * 3 + 1] = randomBetween(0.1, 2.0);
    base[i * 3 + 2] = randomBetween(0.15, 1.4);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    map: createSoftDotTexture('255,255,255'),
    color: 0x9fdcff,
    size: 0.025,
    transparent: true,
    opacity: .55,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  scene.add(points);
  return { points, base };
}

function addDecor(scene, materials) {
  addWindow(scene);
  addKitchen(scene, materials);
  addLowerDoorDecorations(scene);
  return {
    clockHands: addClock(scene, materials),
    dust: createDust(scene)
  };
}

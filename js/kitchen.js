// 廚房流理台：在自己的座標系裡沿 +X 延伸，牆在 z=0，櫃門朝 +Z
const counterSize = { top: 0.9, depth: 0.62, upperY0: 1.45, upperY1: 2.1, upperDepth: 0.34 };

function createKitchenMaterials(materials) {
  return {
    cabinet: new THREE.MeshStandardMaterial({ color: 0x2e3b40, roughness: .6, envMap: materials.envMap, envMapIntensity: .25 }),
    kick: new THREE.MeshStandardMaterial({ color: 0x15191c, roughness: .9 }),
    counter: new THREE.MeshStandardMaterial({ color: 0x9a948b, roughness: .35, envMap: materials.envMap, envMapIntensity: .5 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x1c1f23, roughness: .3, metalness: .6, envMap: materials.envMap }),
    chrome: materials.chrome
  };
}

function addCabinetDoors(run, kitchenMaterials, length, y, height, z, handleY) {
  const count = Math.max(1, Math.round(length / 0.5));
  const doorWidth = length / count;

  for (let i = 0; i < count; i++) {
    const x = doorWidth * (i + 0.5);
    addBox(run, kitchenMaterials.cabinet, [doorWidth - 0.012, height, 0.02], [x, y, z]);
    addBox(run, kitchenMaterials.chrome, [0.12, 0.012, 0.018], [x, handleY, z + 0.02]);
  }
}

function addCounterRun(scene, kitchenMaterials, { length, position, rotationY, uppers }) {
  const run = new THREE.Group();
  run.position.copy(position);
  run.rotation.y = rotationY;
  scene.add(run);

  addBox(run, kitchenMaterials.kick, [length, 0.1, 0.52], [length / 2, 0.05, 0.26]);
  addBox(run, kitchenMaterials.cabinet, [length, 0.76, 0.56], [length / 2, 0.48, 0.28]);
  addCabinetDoors(run, kitchenMaterials, length, 0.48, 0.72, 0.57, 0.8);
  addBox(run, kitchenMaterials.counter, [length, 0.04, counterSize.depth], [length / 2, counterSize.top - 0.02, counterSize.depth / 2]);

  const backsplash = new THREE.Mesh(
    new THREE.PlaneGeometry(length, counterSize.upperY0 - counterSize.top),
    new THREE.MeshStandardMaterial({ map: createSubwayTileTexture(length / 0.6), roughness: .3, envMap: kitchenMaterials.counter.envMap, envMapIntensity: .4 })
  );
  backsplash.position.set(length / 2, (counterSize.top + counterSize.upperY0) / 2, 0.003);
  backsplash.receiveShadow = true;
  run.add(backsplash);

  if (uppers) {
    const height = counterSize.upperY1 - counterSize.upperY0;
    const y = (counterSize.upperY0 + counterSize.upperY1) / 2;
    addBox(run, kitchenMaterials.cabinet, [length, height, counterSize.upperDepth - 0.02], [length / 2, y, (counterSize.upperDepth - 0.02) / 2]);
    addCabinetDoors(run, kitchenMaterials, length, y, height - 0.02, counterSize.upperDepth - 0.01, counterSize.upperY0 + 0.06);
  }

  return run;
}

function addSink(run, kitchenMaterials, x) {
  addBox(run, kitchenMaterials.darkSteel, [0.5, 0.004, 0.36], [x, counterSize.top + 0.001, 0.32]);

  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.3, 14), kitchenMaterials.chrome);
  spout.position.set(x, counterSize.top + 0.15, 0.09);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.16, 14), kitchenMaterials.chrome);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(x, counterSize.top + 0.29, 0.16);
  run.add(spout, arm);
}

function addStove(run, kitchenMaterials, x) {
  addBox(run, kitchenMaterials.darkSteel, [0.6, 0.006, 0.52], [x, counterSize.top + 0.003, 0.32]);

  const burnerMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: .5, metalness: .5 });
  [[-0.14, 0.2], [0.14, 0.2], [-0.14, 0.44], [0.14, 0.44]].forEach(([dx, z]) => {
    const burner = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 28), burnerMaterial);
    burner.rotation.x = Math.PI / 2;
    burner.position.set(x + dx, counterSize.top + 0.01, z);
    run.add(burner);
  });

  // 爐台上一壺紅色琺瑯水壺
  const kettleMaterial = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: .25, envMap: kitchenMaterials.counter.envMap });
  const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), kettleMaterial);
  kettle.scale.y = 0.8;
  kettle.position.set(x + 0.14, counterSize.top + 0.08, 0.44);
  kettle.castShadow = true;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.018, 0.1, 10), kettleMaterial);
  spout.position.set(0.1, 0.03, 0);
  spout.rotation.z = -0.9;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 8, 20, Math.PI), kitchenMaterials.kick);
  handle.position.y = 0.06;
  kettle.add(spout, handle);
  run.add(kettle);

  // 爐台面板上的電子時鐘，整間廚房唯一的暖冷色以外的小亮點
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.037), new THREE.MeshBasicMaterial({ map: createStoveClockTexture() }));
  clock.position.set(x, 0.84, 0.581);
  run.add(clock);
}

function addToaster(run, kitchenMaterials, x) {
  const toaster = new THREE.Mesh(createRoundedBoxGeometry(0.26, 0.18, 0.15, 0.05, 0.015), kitchenMaterials.chrome);
  toaster.position.set(x, counterSize.top + 0.09, 0.3);
  toaster.castShadow = true;
  [-0.04, 0.04].forEach(dz => addBox(toaster, kitchenMaterials.kick, [0.18, 0.004, 0.025], [0, 0.089, dz]));
  run.add(toaster);
}

function addCounterProps(run, kitchenMaterials, x) {
  const board = new THREE.Mesh(
    createRoundedBoxGeometry(0.34, 0.24, 0.02, 0.03, 0.006),
    new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: .7 })
  );
  board.rotation.x = -Math.PI / 2;
  board.position.set(x, counterSize.top + 0.01, 0.34);
  board.receiveShadow = true;
  run.add(board);

  const lemonMaterial = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: .5 });
  [[-0.06, 0.3], [0.03, 0.36], [0.07, 0.28]].forEach(([dx, z]) => {
    const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), lemonMaterial);
    lemon.scale.set(1.25, 1, 1);
    lemon.position.set(x + dx, counterSize.top + 0.055, z);
    lemon.castShadow = true;
    run.add(lemon);
  });

  const crock = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.15, 20), new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: .5 }));
  crock.position.set(x + 0.4, counterSize.top + 0.075, 0.14);
  run.add(crock);
  [[-0.015, 0.2, 0.1], [0.02, 0.24, -0.08], [0, 0.22, 0.02]].forEach(([dx, length, tilt]) => {
    const utensil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, length, 8), kitchenMaterials.kick);
    utensil.position.set(dx, 0.075 + length / 2 - 0.06, 0);
    utensil.rotation.z = tilt;
    crock.add(utensil);
  });
}

function addKitchen(scene, materials) {
  const kitchenMaterials = createKitchenMaterials(materials);
  const fridgeEdge = fridgeSize.z0 + fridgeSize.w + 0.03;

  // 左牆（x=0）：緊貼冰箱的一排，有吊櫃、爐台、烤麵包機
  const leftLength = 3.6 - fridgeEdge;
  const leftRun = addCounterRun(scene, kitchenMaterials, {
    length: leftLength,
    position: new THREE.Vector3(0, 0, 3.6),
    rotationY: Math.PI / 2,
    uppers: true
  });
  addToaster(leftRun, kitchenMaterials, leftLength - 0.25);
  addCounterProps(leftRun, kitchenMaterials, leftLength - 0.95);
  addStove(leftRun, kitchenMaterials, leftLength - 1.6);

  // 右牆（z=0）：從冰箱開門的範圍外開始，窗戶下方是水槽
  const rightStart = 1.45;
  const rightRun = addCounterRun(scene, kitchenMaterials, {
    length: 3.6 - rightStart,
    position: new THREE.Vector3(rightStart, 0, 0),
    rotationY: 0,
    uppers: false
  });
  addSink(rightRun, kitchenMaterials, kitchenWindow.x - rightStart);
}

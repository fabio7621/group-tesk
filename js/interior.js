const shelfY = 1.53;

const rewardSpecs = [
  { id: 'r1', name: '代洗碗', points: 30, color: 0xf2877e, accent: '#d8574c', floorY: shelfY + 0.004, z: 0.45 },
  { id: 'r2', name: '早午餐', points: 80, color: 0xf6c35b, accent: '#c98a12', floorY: shelfY + 0.004, z: 0.77 },
  { id: 'r3', name: '電影票', points: 120, color: 0x9b8cf0, accent: '#6a55d6', floorY: compartment.y0 + 0.01, z: 0.61 }
];

function addBox(parent, material, [width, height, depth], [x, y, z]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addFridgeInterior(scene, materials) {
  const { x0, x1, y0, y1, z0, z1 } = compartment;
  const depth = x1 - x0;
  const width = z1 - z0;
  const height = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const cz = (z0 + z1) / 2;
  const wall = 0.01;

  addBox(scene, materials.liner, [depth, wall, width], [cx, y0 + wall / 2, cz]);
  addBox(scene, materials.liner, [depth, wall, width], [cx, y1 - wall / 2, cz]);
  addBox(scene, materials.liner, [depth, height, wall], [cx, cy, z0 + wall / 2]);
  addBox(scene, materials.liner, [depth, height, wall], [cx, cy, z1 - wall / 2]);

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: createLinerTexture(), roughness: .5 })
  );
  back.rotation.y = Math.PI / 2;
  back.position.set(x0 + 0.001, cy, cz);
  scene.add(back);

  // 玻璃層板＋白色前緣，前面留空間給門內側的置物架
  const glass = new THREE.MeshStandardMaterial({
    color: 0xcff0ff, transparent: true, opacity: .32, roughness: .05, envMap: materials.envMap, depthWrite: false
  });
  addBox(scene, glass, [x1 - 0.1 - x0, 0.008, width - 0.004], [(x0 + x1 - 0.1) / 2, shelfY, cz]);
  addBox(scene, materials.liner, [0.012, 0.018, width - 0.004], [x1 - 0.106, shelfY, cz]);

  const led = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.008, width - 0.06),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2fbff).multiplyScalar(1.8) })
  );
  led.position.set(x1 - 0.06, y1 - wall - 0.004, cz);
  scene.add(led);

  addPantryItems(scene, materials);
}

function addPantryItems(scene, materials) {
  const floorY = compartment.y0 + 0.01;

  const jarGlass = new THREE.MeshStandardMaterial({
    color: 0xe8f6ff, transparent: true, opacity: .35, roughness: .05, envMap: materials.envMap, depthWrite: false
  });
  const jam = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.055, 20), new THREE.MeshStandardMaterial({ color: 0xb8243f, roughness: .35 }));
  jam.position.set(0.22, floorY + 0.0285, 0.37);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.075, 20), jarGlass);
  jar.position.set(0.22, floorY + 0.0375, 0.37);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.014, 20), new THREE.MeshStandardMaterial({ color: 0xe0b13a, roughness: .4 }));
  lid.position.set(0.22, floorY + 0.082, 0.37);
  scene.add(jam, jar, lid);

  const appleMaterial = new THREE.MeshStandardMaterial({ color: 0xd93a3a, roughness: .35, envMap: materials.envMap, envMapIntensity: .4 });
  [[0.26, 0.84], [0.19, 0.8], [0.3, 0.77]].forEach(([x, z]) => {
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.03, 18, 14), appleMaterial);
    apple.scale.y = 0.9;
    apple.position.set(x, floorY + 0.027, z);
    apple.castShadow = true;
    scene.add(apple);
  });
}

function addDoorInterior(hinge, materials) {
  const back = -fridgeDoorThickness / 2;
  const binLength = upperDoorWidth - 0.14;
  const center = upperDoorWidth / 2;

  const panel = new THREE.Mesh(
    createRoundedBoxGeometry(upperDoorWidth - 0.07, upperDoorSize.h - 0.07, 0.014, 0.03, 0.005),
    materials.liner
  );
  panel.rotation.y = Math.PI / 2;
  panel.position.set(back - 0.006, 0, center);
  hinge.add(panel);

  const plastic = new THREE.MeshStandardMaterial({
    color: 0xd8f1ff, transparent: true, opacity: .6, roughness: .2, envMap: materials.envMap
  });

  [-0.17, 0.07].forEach((binY, index) => {
    addBox(hinge, plastic, [0.078, 0.008, binLength], [back - 0.052, binY, center]);
    addBox(hinge, plastic, [0.006, 0.055, binLength], [back - 0.09, binY + 0.027, center]);
    if (index === 0) addBottles(hinge, materials, back - 0.052, binY + 0.004);
    else addEggs(hinge, back - 0.052, binY + 0.004);
  });
}

function addBottles(hinge, materials, x, floorY) {
  const capMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: .4 });
  [
    { color: 0xfff6e8, height: 0.13, z: 0.14 },
    { color: 0xffa94d, height: 0.12, z: 0.25 },
    { color: 0x6fd08c, height: 0.14, z: 0.36 },
    { color: 0xff7aa2, height: 0.11, z: 0.47 },
    { color: 0x7fc4ff, height: 0.125, z: 0.57 }
  ].forEach(({ color, height, z }) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: .25, envMap: materials.envMap, envMapIntensity: .6 });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, height, 18), material);
    bottle.position.set(x, floorY + height / 2, z);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.024, 0.03, 18), material);
    neck.position.y = height / 2 + 0.015;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 14), capMaterial);
    cap.position.y = height / 2 + 0.037;
    bottle.add(neck, cap);
    hinge.add(bottle);
  });
}

function addEggs(hinge, x, floorY) {
  const eggMaterial = new THREE.MeshStandardMaterial({ color: 0xf6ead4, roughness: .6 });
  for (let i = 0; i < 6; i++) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), eggMaterial);
    egg.scale.y = 1.3;
    egg.position.set(x, floorY + 0.026, 0.14 + i * 0.08);
    hinge.add(egg);
  }
}

function createGiftBox(spec, ribbonMaterial, materials) {
  const size = 0.12;
  const height = 0.1;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(size, height, size),
    new THREE.MeshStandardMaterial({ color: spec.color, roughness: .45, envMap: materials.envMap, envMapIntensity: .4 })
  );
  box.castShadow = true;
  box.position.set(0.33, spec.floorY + height / 2, spec.z);
  box.userData = { kind: 'reward', id: spec.id, name: spec.name, points: spec.points, baseY: box.position.y };

  addBox(box, ribbonMaterial, [size + 0.004, height + 0.004, 0.022], [0, 0, 0]);
  addBox(box, ribbonMaterial, [0.022, height + 0.004, size + 0.004], [0, 0, 0]);

  [-1, 1].forEach(side => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.006, 10, 20), ribbonMaterial);
    loop.position.set(0, height / 2 + 0.013, side * 0.015);
    loop.rotation.set(0, Math.PI / 2 + side * 0.35, 0);
    box.add(loop);
  });

  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 0.075),
    new THREE.MeshStandardMaterial({ map: createGiftTagTexture(spec.name, spec.points, spec.accent), roughness: .8 })
  );
  tag.rotation.set(0, Math.PI / 2, -0.06);
  tag.position.set(size / 2 + 0.006, -0.012, 0);
  box.add(tag);
  box.userData.tag = tag;
  box.userData.spec = spec;

  return box;
}

function addRewards(scene, materials) {
  const ribbonMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff0c2, roughness: .3, metalness: .3, envMap: materials.envMap
  });

  return rewardSpecs.map(spec => {
    const box = createGiftBox(spec, ribbonMaterial, materials);
    scene.add(box);
    return box;
  });
}

function refreshRewardTags(rewards) {
  rewards.forEach(box => {
    const { tag, spec } = box.userData;
    tag.material.map.dispose();
    tag.material.map = createGiftTagTexture(spec.name, spec.points, spec.accent);
    tag.material.needsUpdate = true;
  });
}

function createMist(scene) {
  const texture = createSoftDotTexture('255,255,255');
  const particles = Array.from({ length: 40 }, () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: 0xe6f6ff, transparent: true, opacity: 0, depthWrite: false
    }));
    sprite.visible = false;
    scene.add(sprite);
    return { sprite, age: 0, life: 0, velocity: new THREE.Vector3(), maxOpacity: 0 };
  });
  return { particles };
}

function respawnMistParticle(particle, strength) {
  particle.age = -Math.random() * 0.5 * strength;
  particle.life = randomBetween(2.2, 3.8);
  particle.maxOpacity = randomBetween(.25, .5) * strength;
  particle.velocity.set(randomBetween(.12, .32), randomBetween(-.08, .01), randomBetween(-.05, .05));
  particle.sprite.position.set(
    compartment.x1 + 0.02,
    randomBetween(compartment.y0, compartment.y0 + 0.2),
    randomBetween(compartment.z0, compartment.z1)
  );
  particle.sprite.material.opacity = 0;
  particle.sprite.visible = true;
}

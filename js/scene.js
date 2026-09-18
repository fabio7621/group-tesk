const fridgeSize = { z0: 0.25, w: 0.72, d: 0.62, h: 1.85 };
fridgeSize.zc = fridgeSize.z0 + fridgeSize.w / 2;

const fridgeDoorThickness = 0.07;
const upperDoorSize = { y0: 1.235, y1: 1.85 };
upperDoorSize.h = upperDoorSize.y1 - upperDoorSize.y0;
upperDoorSize.yc = (upperDoorSize.y0 + upperDoorSize.y1) / 2;
const upperDoorWidth = fridgeSize.w - 0.02;

// 上層冷藏室的內部空間（冰箱本體在這裡挖空）
const compartment = {
  x0: 0.04,
  x1: fridgeSize.d,
  y0: upperDoorSize.y0 + 0.03,
  y1: fridgeSize.h - 0.05,
  z0: fridgeSize.z0 + 0.045,
  z1: fridgeSize.z0 + fridgeSize.w - 0.045
};

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.prepend(renderer.domElement);
  return renderer;
}

function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07090d);
  scene.fog = new THREE.Fog(0x07090d, 5, 11);
  return scene;
}

function createCamera() {
  return new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 40);
}

function createMaterials(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(createEnvironmentTexture()).texture;
  pmrem.dispose();

  const chrome = new THREE.MeshStandardMaterial({ color: 0xeef2f5, metalness: 1, roughness: .18, envMap, envMapIntensity: 1.4 });
  const chromeGlow = chrome.clone();
  chromeGlow.emissive.setHex(0x8fdcff);
  chromeGlow.emissiveIntensity = 0;

  return {
    envMap,
    chrome,
    chromeGlow,
    // 復古琺瑯：底色霧一點，上面一層亮漆反光
    enamel: new THREE.MeshPhysicalMaterial({
      color: 0x9fd6c4, roughness: .45, metalness: .02, clearcoat: 1, clearcoatRoughness: .07, envMap, envMapIntensity: .6
    }),
    liner: new THREE.MeshStandardMaterial({ color: 0xeef7fb, roughness: .5, envMap, envMapIntensity: .35 })
  };
}

function addWall(scene, material, width, height, position, rotationY) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  wall.rotation.y = rotationY;
  wall.position.copy(position);
  wall.receiveShadow = true;
  scene.add(wall);
  return wall;
}

function addRoom(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshPhysicalMaterial({ map: createFloorTileTexture(), roughness: .5, clearcoat: .5, clearcoatRoughness: .25 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(4, 0, 4);
  floor.receiveShadow = true;
  scene.add(floor);

  const paint = createWallPaintTexture();
  addWall(scene, new THREE.MeshStandardMaterial({ map: paint, roughness: .9 }), 12, 3, new THREE.Vector3(0, 1.5, 4.5), Math.PI / 2);
  addWall(scene, new THREE.MeshStandardMaterial({ map: paint, color: 0xd6dcea, roughness: .9 }), 12, 3, new THREE.Vector3(4.5, 1.5, 0), 0);

  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x5a5f66, roughness: .6 });
  [
    [0.025, 0.1, 12, 0.0125, 0.05, 4.5],
    [12, 0.1, 0.025, 4.5, 0.05, 0.0125]
  ].forEach(([w, h, d, x, y, z]) => addBox(scene, trimMaterial, [w, h, d], [x, y, z]));
}

// 半夜關燈的廚房：只剩很弱的環境光和窗外月光，冰箱的冷光是主角
function addLighting(scene) {
  scene.add(new THREE.HemisphereLight(0x3d4a6a, 0x0c0b0a, 0.28));

  const fill = new THREE.DirectionalLight(0x5a6c96, 0.12);
  fill.position.set(6, 4, 6);
  scene.add(fill);

  const moonLight = new THREE.DirectionalLight(0x8ea6e8, 0.35);
  moonLight.position.set(kitchenWindow.x + 0.6, 4, -2.5);
  moonLight.target.position.set(kitchenWindow.x, 0.9, 0.8);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.bias = -0.0004;
  scene.add(moonLight, moonLight.target);

  const innerLight = new THREE.PointLight(0xdff4ff, 1.2, 5, 2);
  innerLight.position.set(0.5, 1.72, fridgeSize.zc);
  scene.add(innerLight);

  // 從門縫漏出來、打在地板和旁邊流理台上的冷光
  const leakLight = new THREE.PointLight(0x8fdcff, 0.9, 2.6, 2);
  leakLight.position.set(fridgeSize.d + 0.6, 0.3, fridgeSize.zc);
  scene.add(leakLight);

  return { innerLight, leakLight };
}

function addFridgeBody(scene, materials) {
  const hole = {
    x: 0,
    y: (compartment.y0 + compartment.y1) / 2 - fridgeSize.h / 2,
    width: compartment.z1 - compartment.z0,
    height: compartment.y1 - compartment.y0,
    radius: 0.025
  };

  const body = new THREE.Mesh(
    createRoundedBoxGeometry(fridgeSize.w, fridgeSize.h, fridgeSize.d, 0.07, 0.012, hole),
    materials.enamel
  );
  body.rotation.y = Math.PI / 2;
  body.position.set(fridgeSize.d / 2, fridgeSize.h / 2, fridgeSize.zc);
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);
  return body;
}

function createHandle(material, length) {
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, length, 20), material);
  bar.castShadow = true;

  [-1, 1].forEach(side => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.036, 14), material);
    post.rotation.z = Math.PI / 2;
    post.position.set(-0.018, side * (length / 2 - 0.025), 0);
    bar.add(post);
  });

  return bar;
}

function createDoorMesh(material, height) {
  const door = new THREE.Mesh(
    createRoundedBoxGeometry(upperDoorWidth, height, fridgeDoorThickness, 0.05, 0.02),
    material
  );
  door.rotation.y = Math.PI / 2;
  door.castShadow = true;
  door.receiveShadow = true;
  return door;
}

function addFixedLowerDoor(scene, materials) {
  const lowerDoor = createDoorMesh(materials.enamel, 1.15);
  lowerDoor.position.set(fridgeSize.d + fridgeDoorThickness / 2, 0.05 + 1.15 / 2, fridgeSize.zc);
  scene.add(lowerDoor);

  const lowerHandle = createHandle(materials.chrome, 0.3);
  lowerHandle.position.set(fridgeSize.d + fridgeDoorThickness + 0.036, 1.0, fridgeSize.z0 + fridgeSize.w - 0.08);
  scene.add(lowerHandle);

  return { lowerDoor, lowerHandle };
}

function addHingedUpperDoor(scene, materials) {
  const hinge = new THREE.Group();
  hinge.position.set(fridgeSize.d + fridgeDoorThickness / 2, upperDoorSize.yc, fridgeSize.z0 + 0.01);
  scene.add(hinge);

  const upperDoor = createDoorMesh(materials.enamel, upperDoorSize.h);
  upperDoor.position.set(0, 0, upperDoorWidth / 2);
  hinge.add(upperDoor);

  const handle = createHandle(materials.chromeGlow, 0.26);
  handle.position.set(fridgeDoorThickness / 2 + 0.036, -0.08, upperDoorWidth - 0.07);
  handle.userData.kind = 'handle';
  hinge.add(handle);

  addDoorInterior(hinge, materials);

  return { hinge, upperDoor, handle };
}

// 冰箱底部的接地陰影，讓冰箱「站」在地上而不是浮著
function addContactShadow(scene) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(fridgeSize.d + 0.35, fridgeSize.w + 0.35),
    new THREE.MeshBasicMaterial({ map: createSoftShadowTexture(), transparent: true, depthWrite: false, opacity: .9 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set((fridgeSize.d + fridgeDoorThickness) / 2, 0.003, fridgeSize.zc);
  scene.add(shadow);
}

function addBadge(scene) {
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.06),
    new THREE.MeshStandardMaterial({ map: createBadgeTexture(), transparent: true, metalness: .6, roughness: .3 })
  );
  badge.rotation.y = Math.PI / 2;
  badge.position.set(fridgeSize.d + fridgeDoorThickness + 0.002, 1.1, fridgeSize.zc - 0.08);
  scene.add(badge);
}

function addFridgeGlow(scene) {
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x8fdcff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: .8
  });

  const verticalSeam = new THREE.Mesh(new THREE.PlaneGeometry(0.012, upperDoorSize.h - 0.08), glowMaterial);
  verticalSeam.rotation.y = Math.PI / 2;
  verticalSeam.position.set(fridgeSize.d + fridgeDoorThickness + 0.004, upperDoorSize.yc, fridgeSize.z0 + fridgeSize.w - 0.012);
  scene.add(verticalSeam);

  const horizontalSeam = new THREE.Mesh(new THREE.PlaneGeometry(fridgeSize.w - 0.08, 0.02), glowMaterial.clone());
  horizontalSeam.rotation.y = Math.PI / 2;
  horizontalSeam.position.set(fridgeSize.d + fridgeDoorThickness + 0.004, 1.218, fridgeSize.zc);
  scene.add(horizontalSeam);

  const spill = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.5),
    new THREE.MeshBasicMaterial({
      map: createRadialLightTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: .5
    })
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(fridgeSize.d + 0.8, 0.012, fridgeSize.zc);
  scene.add(spill);

  // 門縫外圍的柔光暈，讓冷光在暗處更醒目
  const haloTexture = createRadialLightTexture();
  const createHalo = (width, height, y, z) => {
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: haloTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 })
    );
    halo.rotation.y = Math.PI / 2;
    halo.position.set(fridgeSize.d + fridgeDoorThickness + 0.006, y, z);
    scene.add(halo);
    return halo;
  };
  const halos = [
    createHalo(0.2, upperDoorSize.h + 0.25, upperDoorSize.yc, fridgeSize.z0 + fridgeSize.w - 0.012),
    createHalo(fridgeSize.w + 0.2, 0.2, 1.218, fridgeSize.zc)
  ];

  return { verticalSeam, horizontalSeam, spill, halos };
}

function addTaskNotes(hinge, tasks) {
  const noteMeshes = {};
  const shadowTexture = createSoftShadowTexture();

  tasks.forEach(task => {
    const group = new THREE.Group();
    group.rotation.y = Math.PI / 2;
    group.position.set(fridgeDoorThickness / 2 + 0.004, task.y, task.z);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2, 0.2),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: .7 })
    );
    shadow.rotation.z = task.tilt;
    shadow.position.set(0.004, -0.008, 0.0005);
    group.add(shadow);

    const texture = toTexture(drawTaskNote(task));
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.16),
      // 一點自發光讓便利貼在昏暗房間裡也保持鮮豔
      new THREE.MeshStandardMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: .22, roughness: .85 })
    );
    mesh.position.z = 0.002;
    mesh.rotation.z = task.tilt;
    mesh.userData.kind = 'note';
    mesh.userData.id = task.id;
    mesh.userData.shadow = shadow;

    group.add(mesh);
    hinge.add(group);
    noteMeshes[task.id] = mesh;
  });

  return noteMeshes;
}

function refreshTaskNote(task, noteMeshes) {
  const mesh = noteMeshes[task.id];
  mesh.material.map.dispose();
  mesh.material.map = toTexture(drawTaskNote(task));
  mesh.material.emissiveMap = mesh.material.map;
  mesh.material.needsUpdate = true;
}

// r128 把 hex 顏色當成線性值，畫出來會整片偏白；統一轉成 sRGB 才會是設計稿上的顏色
function linearizeSceneColors(scene) {
  const converted = new Set();
  const convert = color => {
    if (!color || converted.has(color)) return;
    color.convertSRGBToLinear();
    converted.add(color);
  };

  convert(scene.background);
  convert(scene.fog.color);
  scene.traverse(object => {
    convert(object.color);
    convert(object.groundColor);
    [].concat(object.material || []).forEach(material => {
      convert(material.color);
      convert(material.emissive);
    });
  });
}

function createFridgeScene() {
  const renderer = createRenderer();
  const scene = createScene();
  const camera = createCamera();
  const materials = createMaterials(renderer);

  addRoom(scene);
  const lights = addLighting(scene);
  const decor = addDecor(scene, materials);
  addFridgeInterior(scene, materials);
  const rewards = addRewards(scene, materials);
  const mist = createMist(scene);

  const body = addFridgeBody(scene, materials);
  addContactShadow(scene);
  addBadge(scene);
  const lowerDoorParts = addFixedLowerDoor(scene, materials);
  const upperDoorParts = addHingedUpperDoor(scene, materials);
  const glow = addFridgeGlow(scene);
  const noteMeshes = addTaskNotes(upperDoorParts.hinge, appState.tasks);
  linearizeSceneColors(scene);
  // 門縫是 HDR 光源：亮度超過 1，後製的 bloom 只會讓這種真正的高光暈開
  glow.verticalSeam.material.color.multiplyScalar(4);
  glow.horizontalSeam.material.color.multiplyScalar(4);
  const postfx = createPostProcessing(renderer, scene, camera);

  return {
    renderer,
    postfx,
    scene,
    camera,
    lights,
    decor,
    rewards,
    mist,
    body,
    lowerDoor: lowerDoorParts.lowerDoor,
    upperDoor: upperDoorParts.upperDoor,
    hinge: upperDoorParts.hinge,
    handle: upperDoorParts.handle,
    verticalSeam: glow.verticalSeam,
    horizontalSeam: glow.horizontalSeam,
    spill: glow.spill,
    halos: glow.halos,
    noteMeshes
  };
}

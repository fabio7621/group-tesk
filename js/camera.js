const BASE_FOV = 32;
const FIT_MIN_ASPECT = 1.1;    // 畫面比這更窄（直向手機、平板）就開始補償
const FIT_MAX_FOV_STRETCH = 1.5; // FOV 最多放大到約 46°，再大會變形，剩下的改用拉遠鏡頭

// 窄螢幕時水平可視範圍變小：先放大 FOV，不夠再把鏡頭往後拉，讓冰箱左右不被裁掉
function getViewportFit() {
  const fit = Math.max(1, FIT_MIN_ASPECT / (innerWidth / innerHeight));
  const fovStretch = Math.min(fit, FIT_MAX_FOV_STRETCH);
  const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * fovStretch);

  return { fov: THREE.MathUtils.radToDeg(halfFov * 2), dolly: fit / fovStretch };
}

function fitCameraToViewport(camera) {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = getViewportFit().fov;
  camera.updateProjectionMatrix();
}

function pullBack(preset, dolly) {
  return { pos: preset.target.clone().lerp(preset.pos, dolly), target: preset.target };
}

function createCameraPresets() {
  const portrait = innerWidth / innerHeight < 0.8;
  const { dolly } = getViewportFit();

  return {
    // 房間視角已有直向專用機位，再拉遠會整個沒進霧裡
    room: portrait
      ? { pos: new THREE.Vector3(3.6, 2.5, 3.9), target: new THREE.Vector3(0.32, 1.0, 0.5) }
      : { pos: new THREE.Vector3(3.1, 2.35, 3.5), target: new THREE.Vector3(0.35, 0.85, 0.42) },
    fridge: pullBack({
      pos: new THREE.Vector3(2.1, 1.58, fridgeSize.zc),
      target: new THREE.Vector3(fridgeSize.d, upperDoorSize.yc, fridgeSize.zc)
    }, dolly),
    open: pullBack({
      pos: new THREE.Vector3(2.25, 1.66, 1.35),
      target: new THREE.Vector3(0.5, 1.5, 0.56)
    }, dolly)
  };
}

function setInitialCameraView(camera) {
  fitCameraToViewport(camera);
  const presets = createCameraPresets();
  const cameraPosition = presets.room.pos.clone();
  const cameraTarget = presets.room.target.clone();

  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);

  return { cameraPosition, cameraTarget, parallax: new THREE.Vector2() };
}

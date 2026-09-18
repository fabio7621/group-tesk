function createCameraPresets() {
  const portrait = innerWidth / innerHeight < 0.8;

  return {
    room: portrait
      ? { pos: new THREE.Vector3(3.6, 2.5, 3.9), target: new THREE.Vector3(0.32, 1.0, 0.5) }
      : { pos: new THREE.Vector3(3.1, 2.35, 3.5), target: new THREE.Vector3(0.35, 0.85, 0.42) },
    fridge: {
      pos: new THREE.Vector3(2.1, 1.58, fridgeSize.zc),
      target: new THREE.Vector3(fridgeSize.d, upperDoorSize.yc, fridgeSize.zc)
    },
    open: {
      pos: new THREE.Vector3(2.25, 1.66, 1.35),
      target: new THREE.Vector3(0.5, 1.5, 0.56)
    }
  };
}

function setInitialCameraView(camera) {
  const presets = createCameraPresets();
  const cameraPosition = presets.room.pos.clone();
  const cameraTarget = presets.room.target.clone();

  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);

  return { cameraPosition, cameraTarget, parallax: new THREE.Vector2() };
}

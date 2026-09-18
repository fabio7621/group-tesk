const sceneParts = createFridgeScene();
sceneParts.targets = {
  doorAngle: 0,
  innerLight: 1.2,
  leak: 0.9,
  seam: 1,
  spill: 0.75,
  handleGlow: 0
};

const ui = {
  sceneParts,
  messageElement: document.getElementById('msg'),
  progressElement: document.getElementById('progress'),
  backButton: document.getElementById('back'),
  audio: createFridgeAudio(),
  cameraState: setInitialCameraView(sceneParts.camera),
  animationState: { shakeStart: -1, hovered: null, hoverFridge: false, pops: {}, lastView: appState.view },
  pointer: new THREE.Vector2(),
  clock: new THREE.Clock()
};

document.fonts.ready.then(() => {
  appState.tasks.forEach(task => refreshTaskNote(task, sceneParts.noteMeshes));
  refreshRewardTags(sceneParts.rewards);
});

addPointerInteractions(ui);
addNavigationControls(ui);
addSoundControls(ui);
addResizeHandler(sceneParts);
startTaskSyncSimulation(ui);
renderViewUi(ui);
startAnimationLoop(ui);

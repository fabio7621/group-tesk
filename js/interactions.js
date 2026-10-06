function createObjectPicker(renderer, camera) {
  const raycaster = new THREE.Raycaster();
  const pointerPosition = new THREE.Vector2();

  return function pickObject(clientX, clientY, objects) {
    pointerPosition.set(clientX / innerWidth * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointerPosition, camera);
    return raycaster.intersectObjects(objects, false)[0]?.object || null;
  };
}

function createClickableGroups(sceneParts) {
  const fridgeParts = [sceneParts.body, sceneParts.lowerDoor, sceneParts.upperDoor];
  const noteList = Object.values(sceneParts.noteMeshes);

  return {
    fridgeParts,
    roomTargets: [...fridgeParts, sceneParts.verticalSeam, sceneParts.spill],
    fridgeTargets: [...noteList, sceneParts.handle],
    openTargets: sceneParts.rewards
  };
}

function handleFridgeClick(hit, ui) {
  if (hit.userData.kind === 'note') {
    const task = findTaskById(hit.userData.id);
    setTaskDone(hit.userData.id, !task.done, ui);
    return;
  }

  if (hit.userData.kind === 'handle' && canOpenFridgeDoor()) {
    setAppView('open', ui);
    return;
  }

  ui.animationState.shakeStart = ui.clock.elapsedTime;
  ui.audio.play('rattle');
  showMessage(ui.messageElement, '門還打不開，先完成至少一張任務');
}

function handleRewardClick(hit, ui) {
  const { id, name, points } = hit.userData;
  ui.animationState.pops[id] = ui.clock.elapsedTime;
  showMessage(ui.messageElement, `選了「${name}」（${points} 點），兌換功能等接上後端`);
}

function addPointerInteractions(ui) {
  const { renderer, camera } = ui.sceneParts;
  const pickObject = createObjectPicker(renderer, camera);
  const clickableGroups = createClickableGroups(ui.sceneParts);

  renderer.domElement.addEventListener('pointerdown', event => {
    if (appState.view === 'room') {
      if (pickObject(event.clientX, event.clientY, clickableGroups.roomTargets)) {
        setAppView('fridge', ui);
      }
      return;
    }

    if (appState.view === 'fridge') {
      const hit = pickObject(event.clientX, event.clientY, clickableGroups.fridgeTargets);
      if (hit) handleFridgeClick(hit, ui);
      return;
    }

    const hit = pickObject(event.clientX, event.clientY, clickableGroups.openTargets);
    if (hit) handleRewardClick(hit, ui);
  });

  renderer.domElement.addEventListener('pointermove', event => {
    ui.pointer.set(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);

    const targets = {
      room: clickableGroups.fridgeParts,
      fridge: clickableGroups.fridgeTargets,
      open: clickableGroups.openTargets
    }[appState.view];
    const hit = pickObject(event.clientX, event.clientY, targets);

    ui.animationState.hovered = hit;
    ui.animationState.hoverFridge = appState.view === 'room' && Boolean(hit);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
  });

  renderer.domElement.addEventListener('pointerleave', () => {
    ui.pointer.set(0, 0);
    ui.animationState.hovered = null;
    ui.animationState.hoverFridge = false;
  });
}

function goBack(ui) {
  if (appState.view === 'open') {
    setAppView('fridge', ui);
    return;
  }

  if (appState.view === 'fridge') {
    setAppView('room', ui);
  }
}

function addNavigationControls(ui) {
  ui.backButton.addEventListener('click', () => goBack(ui));
  addEventListener('keydown', event => {
    if (event.key === 'Escape') goBack(ui);
  });
}

function addResizeHandler(sceneParts) {
  addEventListener('resize', () => {
    fitCameraToViewport(sceneParts.camera);
    sceneParts.renderer.setSize(innerWidth, innerHeight);
    sceneParts.postfx.setSize(innerWidth, innerHeight);
  });
}

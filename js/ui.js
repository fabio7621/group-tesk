function showMessage(messageElement, text) {
  if (messageElement.textContent === text) return;

  messageElement.textContent = text;
  messageElement.animate?.(
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }
  );
}

function getViewMessage() {
  if (appState.view === 'room') return '點一下發著藍光的冰箱';

  if (appState.view === 'fridge') {
    return canOpenFridgeDoor()
      ? '已有任務完成，拉開發亮的門把手'
      : '點便利貼標記完成，就能打開冰箱門';
  }

  return '兌換區打開了，挑一個獎品吧';
}

function renderProgress(progressElement) {
  const doneCount = appState.tasks.filter(task => task.done).length;
  const dots = appState.tasks.map(task => {
    const dot = document.createElement('span');
    dot.className = task.done ? 'dot done' : 'dot';
    dot.style.setProperty('--note', task.color);
    return dot;
  });
  const label = document.createElement('span');
  label.textContent = `任務 ${doneCount} / ${appState.tasks.length}`;

  progressElement.replaceChildren(...dots, label);
}

function renderViewUi(ui) {
  const { sceneParts } = ui;
  const isOpen = appState.view === 'open';
  document.body.dataset.view = appState.view;

  sceneParts.targets.doorAngle = isOpen ? THREE.MathUtils.degToRad(96) : 0;
  sceneParts.targets.innerLight = isOpen ? 1.8 : 1.2;
  sceneParts.targets.leak = isOpen ? 1.6 : 0.9;
  sceneParts.targets.seam = isOpen ? 0 : 1;
  sceneParts.targets.spill = isOpen ? 1 : 0.75;
  sceneParts.targets.handleGlow = (appState.view === 'fridge' && canOpenFridgeDoor()) ? 1.1 : 0;

  ui.audio.setView(appState.view);
  showMessage(ui.messageElement, getViewMessage());
  renderProgress(ui.progressElement);
  ui.backButton.textContent = isOpen ? '關上冰箱門' : '回到房間';
}

function setAppView(nextView, ui) {
  const previousView = appState.view;
  appState.view = nextView;
  if (nextView === 'open' && previousView !== 'open') ui.audio.play('open');
  if (previousView === 'open' && nextView !== 'open') ui.audio.play('close');
  ui.animationState.hovered = null;
  renderViewUi(ui);
}

function setTaskDone(taskId, done, ui) {
  const task = findTaskById(taskId);
  if (!task) return;

  task.done = done;
  ui.animationState.pops[taskId] = ui.clock.elapsedTime;
  refreshTaskNote(task, ui.sceneParts.noteMeshes);
  renderViewUi(ui);
}

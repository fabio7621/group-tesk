function startTaskSyncSimulation(ui) {
  let simulated = false;

  setInterval(() => {
    if (simulated || appState.view === 'room') return;

    simulated = true;
    setTimeout(() => {
      const pendingTask = appState.tasks.find(task => !task.done);
      if (!pendingTask) return;

      setTaskDone(pendingTask.id, true, ui);
      showMessage(ui.messageElement, `（模擬）另一位組員完成了「${pendingTask.title}」`);
    }, 8000);
  }, 1000);
}

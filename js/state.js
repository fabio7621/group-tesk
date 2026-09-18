const appState = {
  view: 'room',
  tasks: [
    { id: 't1', title: '倒垃圾', points: 5, by: '媽媽', color: '#f3dc72', y: 0.115, z: 0.185, tilt: -0.07, done: false },
    { id: 't2', title: '刷浴室', points: 20, by: '姐姐', color: '#f2a8b6', y: 0.095, z: 0.505, tilt: 0.05, done: false },
    { id: 't3', title: '買牛奶回家', points: 10, by: '爸爸', color: '#a9e2bb', y: -0.135, z: 0.345, tilt: -0.02, done: false }
  ]
};

function canOpenFridgeDoor() {
  return appState.tasks.some(task => task.done);
}

function findTaskById(taskId) {
  return appState.tasks.find(task => task.id === taskId);
}

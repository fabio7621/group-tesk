function dampValue(currentValue, targetValue, deltaTime, damping = 3) {
  return THREE.MathUtils.damp(currentValue, targetValue, damping, deltaTime);
}

function dampFactor(deltaTime, speed) {
  return 1 - Math.exp(-speed * deltaTime);
}

// 點擊/狀態改變時的彈跳：0 → 峰值 → 0，持續約 0.45 秒
function popAmount(startTime, elapsedTime) {
  if (startTime === undefined) return 0;
  const progress = (elapsedTime - startTime) / 0.45;
  if (progress < 0 || progress > 1) return 0;
  return Math.sin(progress * Math.PI) * 0.16 * (1 - progress * 0.5);
}

function updateCamera(ui, deltaTime, speed, reduceMotion) {
  const { camera } = ui.sceneParts;
  const { cameraState } = ui;
  const preset = createCameraPresets()[appState.view];

  cameraState.cameraPosition.lerp(preset.pos, dampFactor(deltaTime, speed));
  cameraState.cameraTarget.lerp(preset.target, dampFactor(deltaTime, speed));
  cameraState.parallax.lerp(ui.pointer, dampFactor(deltaTime, 3));

  camera.position.copy(cameraState.cameraPosition);
  camera.lookAt(cameraState.cameraTarget);

  if (reduceMotion) return;

  // 滑鼠視差：鏡頭跟著游標微微移動，房間視角移動最多
  const strength = appState.view === 'room' ? 0.28 : 0.05;
  camera.translateX(cameraState.parallax.x * strength);
  camera.translateY(-cameraState.parallax.y * strength * 0.5);
  camera.lookAt(cameraState.cameraTarget);
}

function updateDoor(sceneParts, animationState, elapsedTime, deltaTime, reduceMotion) {
  let angle = dampValue(
    sceneParts.hinge.rotation.y,
    sceneParts.targets.doorAngle,
    deltaTime,
    reduceMotion ? 30 : 2.6
  );

  if (animationState.shakeStart >= 0 && !reduceMotion) {
    const shakeSeconds = elapsedTime - animationState.shakeStart;
    if (shakeSeconds < 0.5) {
      angle += Math.sin(shakeSeconds * 55) * 0.02 * (1 - shakeSeconds / 0.5);
    } else {
      animationState.shakeStart = -1;
    }
  }

  sceneParts.hinge.rotation.y = angle;
}

function updateLighting(ui, elapsedTime, deltaTime, reduceMotion) {
  const { sceneParts, animationState } = ui;
  const { targets } = sceneParts;
  const flicker = reduceMotion
    ? 1
    : 0.82 + 0.13 * Math.sin(elapsedTime * 2.1) + 0.05 * Math.sin(elapsedTime * 9.7);
  const hoverBoost = animationState.hoverFridge ? 1.5 : 1;
  const closedFlicker = targets.seam > 0 ? flicker : 1;

  sceneParts.lights.innerLight.intensity = dampValue(
    sceneParts.lights.innerLight.intensity,
    targets.innerLight * hoverBoost,
    deltaTime,
    3
  ) * closedFlicker;

  sceneParts.verticalSeam.material.opacity = dampValue(
    sceneParts.verticalSeam.material.opacity,
    Math.min(1, targets.seam * flicker * hoverBoost),
    deltaTime,
    4
  );
  sceneParts.horizontalSeam.material.opacity = sceneParts.verticalSeam.material.opacity;
  sceneParts.halos.forEach(halo => {
    halo.material.opacity = sceneParts.verticalSeam.material.opacity * 0.55;
  });
  sceneParts.lights.leakLight.intensity = targets.leak * closedFlicker * hoverBoost;

  sceneParts.spill.material.opacity = dampValue(
    sceneParts.spill.material.opacity,
    targets.spill * closedFlicker * hoverBoost,
    deltaTime,
    4
  );

  const pulse = reduceMotion ? 1 : 0.55 + 0.45 * Math.sin(elapsedTime * 3.2);
  sceneParts.handle.material.emissiveIntensity = targets.handleGlow * pulse;
}

function updateNotes(ui, elapsedTime, deltaTime) {
  Object.values(ui.sceneParts.noteMeshes).forEach(mesh => {
    const hovered = ui.animationState.hovered === mesh;
    const lift = dampValue(mesh.userData.lift || 0, hovered ? 1 : 0, deltaTime, 12);
    const scale = 1 + lift * 0.06 + popAmount(ui.animationState.pops[mesh.userData.id], elapsedTime);

    mesh.userData.lift = lift;
    mesh.position.z = 0.002 + lift * 0.012;
    mesh.scale.setScalar(scale);
    mesh.userData.shadow.scale.setScalar(1 + lift * 0.1);
    mesh.userData.shadow.position.set(0.004 + lift * 0.006, -0.008 - lift * 0.01, 0.0005);
  });
}

function updateRewards(ui, elapsedTime, deltaTime, reduceMotion) {
  ui.sceneParts.rewards.forEach((box, index) => {
    const hovered = ui.animationState.hovered === box;
    const lift = dampValue(box.userData.lift || 0, hovered ? 1 : 0, deltaTime, 10);
    const pop = popAmount(ui.animationState.pops[box.userData.id], elapsedTime);
    const idle = reduceMotion ? 0 : Math.sin(elapsedTime * 1.3 + index * 2);

    box.userData.lift = lift;
    box.position.y = box.userData.baseY + lift * 0.02 + pop * 0.15;
    box.rotation.y = idle * 0.05 + lift * 0.25;
    box.scale.setScalar(1 + pop);
  });
}

function updateDecor(decor, elapsedTime, reduceMotion) {
  const now = new Date();
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  decor.clockHands.second.rotation.z = -seconds / 60 * Math.PI * 2;
  decor.clockHands.minute.rotation.z = -minutes / 60 * Math.PI * 2;
  decor.clockHands.hour.rotation.z = -hours / 12 * Math.PI * 2;

  if (reduceMotion) return;

  const { points, base } = decor.dust;
  const positions = points.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const phase = i * 1.7;
    positions.setXYZ(
      i,
      base[i * 3] + Math.sin(elapsedTime * 0.13 + phase) * 0.12,
      base[i * 3 + 1] + Math.sin(elapsedTime * 0.09 + phase * 1.3) * 0.18,
      base[i * 3 + 2] + Math.cos(elapsedTime * 0.11 + phase) * 0.12
    );
  }
  positions.needsUpdate = true;
}

function updateMist(ui, deltaTime, reduceMotion) {
  const { animationState } = ui;
  const isOpen = appState.view === 'open';
  const justOpened = isOpen && animationState.lastView !== 'open';
  animationState.lastView = appState.view;

  if (reduceMotion) return;

  ui.sceneParts.mist.particles.forEach(particle => {
    if (justOpened) respawnMistParticle(particle, 1);

    if (particle.age >= particle.life) {
      if (isOpen && Math.random() < deltaTime * 0.8) respawnMistParticle(particle, 0.45);
      else particle.sprite.visible = false;
      return;
    }

    particle.age += deltaTime;
    if (particle.age < 0) return;

    const progress = particle.age / particle.life;
    particle.velocity.y -= 0.03 * deltaTime;
    particle.sprite.position.addScaledVector(particle.velocity, deltaTime);
    particle.sprite.scale.setScalar(0.08 + progress * 0.42);
    particle.sprite.material.opacity = particle.maxOpacity * Math.sin(progress * Math.PI);
  });
}

function startAnimationLoop(ui) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tick() {
    requestAnimationFrame(tick);

    const deltaTime = Math.min(ui.clock.getDelta(), 0.05);
    const elapsedTime = ui.clock.elapsedTime;
    const speed = reduceMotion ? 30 : 3;

    updateCamera(ui, deltaTime, speed, reduceMotion);
    updateDoor(ui.sceneParts, ui.animationState, elapsedTime, deltaTime, reduceMotion);
    updateLighting(ui, elapsedTime, deltaTime, reduceMotion);
    updateNotes(ui, elapsedTime, deltaTime);
    updateRewards(ui, elapsedTime, deltaTime, reduceMotion);
    updateDecor(ui.sceneParts.decor, elapsedTime, reduceMotion);
    updateMist(ui, deltaTime, reduceMotion);

    ui.sceneParts.postfx.render(elapsedTime);
  }

  tick();
}

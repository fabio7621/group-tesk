function traceRoundedRect(path, centerX, centerY, width, height, radius) {
  const x = centerX - width / 2;
  const y = centerY - height / 2;
  const r = Math.max(0.001, Math.min(radius, width / 2, height / 2));

  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

// 圓角方塊：寬沿 X、高沿 Y、厚度沿 Z，中心在原點。hole 會沿 Z 挖穿（用來做冰箱上層的內膽開口）
function createRoundedBoxGeometry(width, height, depth, radius, bevel = 0.012, hole = null) {
  const shape = traceRoundedRect(new THREE.Shape(), 0, 0, width - bevel * 2, height - bevel * 2, radius - bevel);

  if (hole) {
    shape.holes.push(traceRoundedRect(
      new THREE.Path(), hole.x, hole.y, hole.width + bevel * 2, hole.height + bevel * 2, hole.radius + bevel
    ));
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10
  });
  geometry.translate(0, 0, -(depth - bevel * 2) / 2);
  return geometry;
}

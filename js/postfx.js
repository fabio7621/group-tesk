// 最後一道：ACES tone mapping、線性轉 sRGB、暗角、底片顆粒。
// 開後製時場景以 HDR（HalfFloat）畫進 render target，tone mapping 統一在這裡做，bloom 才吃得到真正的高光
const finishShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    exposure: { value: 1.0 },
    grain: { value: 0.045 },
    vignette: { value: 0.38 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float exposure;
    uniform float grain;
    uniform float vignette;
    varying vec2 vUv;

    float random(vec2 point) {
      return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 fitCurve(vec3 v) {
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }

    vec3 acesFilmic(vec3 color) {
      const mat3 inputMatrix = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outputMatrix = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color = outputMatrix * fitCurve(inputMatrix * (color * exposure / 0.6));
      return clamp(color, 0.0, 1.0);
    }

    void main() {
      vec4 hdr = texture2D(tDiffuse, vUv);
      vec4 color = LinearTosRGB(vec4(acesFilmic(hdr.rgb), 1.0));
      float edge = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, edge);
      color.rgb += (random(vUv * 1000.0 + fract(time)) - 0.5) * grain;
      gl_FragColor = color;
    }
  `
};

function createPostProcessing(renderer, scene, camera) {
  const available = THREE.EffectComposer && THREE.UnrealBloomPass && THREE.ShaderPass && THREE.RenderPass;
  if (!available) {
    return {
      render: () => renderer.render(scene, camera),
      setSize: () => {}
    };
  }

  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType });
  const composer = new THREE.EffectComposer(renderer, target);
  composer.setSize(innerWidth, innerHeight);
  const exposure = renderer.toneMappingExposure;
  renderer.toneMapping = THREE.NoToneMapping;
  composer.addPass(new THREE.RenderPass(scene, camera));

  // 只讓最亮的地方（門縫、冰箱內部、LED）暈開
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.45, 1.4);
  composer.addPass(bloom);

  const finish = new THREE.ShaderPass(finishShader);
  finish.uniforms.exposure.value = exposure;
  composer.addPass(finish);

  return {
    render(elapsedTime) {
      finish.uniforms.time.value = elapsedTime;
      composer.render();
    },
    setSize(width, height) {
      composer.setPixelRatio?.(renderer.getPixelRatio());
      composer.setSize(width, height);
    }
  };
}

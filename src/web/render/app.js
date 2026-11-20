import * as THREE from 'three';

/**
 * Initialize WebGL2 renderer, scene, camera, and resize/context-loss handlers.
 */
export function createRenderApp(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1226);
  scene.fog = new THREE.FogExp2(0x0c1226, 0.013);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    220
  );

  function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', handleResize);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
  });

  function setLightMode(enabled) {
    if (enabled) {
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.NoToneMapping;
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
    handleResize();
  }

  return {
    renderer,
    scene,
    camera,
    isWebGL2: renderer.capabilities.isWebGL2,
    setLightMode,
    dispose() {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    }
  };
}

/**
 * Web input controller that latches discrete action taps (Space, E, Q, Shift, Esc/P)
 * until a fixed 60 Hz simulation tick actually consumes them.
 */
export function createWebInputController({ initialYawDeg = 0, sensitivity = 1.0 } = {}) {
  const keys = new Set();
  const latched = {
    jump: false,
    interact: false,
    pulse: false,
    dash: false
  };

  let camYawDeg = initialYawDeg;
  let mouseSensitivity = sensitivity;
  let isDragging = false;
  let lastPointerX = 0;
  let onPauseToggleCallback = null;

  function setOnPauseToggle(cb) {
    onPauseToggleCallback = cb;
  }

  function setSensitivity(val) {
    mouseSensitivity = Math.max(0.3, Math.min(2.5, val));
  }

  function onKeyDown(code, repeat = false) {
    keys.add(code);
    if (repeat) return;
    if (code === 'Space') latched.jump = true;
    if (code === 'KeyE') latched.interact = true;
    if (code === 'KeyQ') latched.pulse = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') latched.dash = true;
    if ((code === 'Escape' || code === 'KeyP') && onPauseToggleCallback) {
      onPauseToggleCallback();
    }
  }

  function onKeyUp(code) {
    keys.delete(code);
  }

  function onBlur() {
    keys.clear();
    isDragging = false;
  }

  function onPointerDown(clientX) {
    isDragging = true;
    lastPointerX = clientX;
  }

  function onPointerMove(clientX) {
    if (!isDragging) return;
    const dx = clientX - lastPointerX;
    lastPointerX = clientX;
    camYawDeg = (camYawDeg - dx * 0.35 * mouseSensitivity) % 360;
  }

  function onPointerUp() {
    isDragging = false;
  }

  function updateCameraYaw(dt) {
    if (keys.has('ArrowLeft')) camYawDeg += 90 * mouseSensitivity * dt;
    if (keys.has('ArrowRight')) camYawDeg -= 90 * mouseSensitivity * dt;
    return camYawDeg;
  }

  function consumeTickInput() {
    let mx = 0;
    let mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
    // Screen-right is -X when looking along +Z in Three.js right-handed space
    if (keys.has('KeyD')) mx -= 1;
    if (keys.has('KeyA')) mx += 1;

    const frame = {
      move: [mx, mz],
      cam_yaw_deg: camYawDeg,
      jump: keys.has('Space') || latched.jump,
      interact: keys.has('KeyE') || latched.interact,
      pulse: keys.has('KeyQ') || latched.pulse,
      dash: keys.has('ShiftLeft') || keys.has('ShiftRight') || latched.dash
    };

    latched.jump = false;
    latched.interact = false;
    latched.pulse = false;
    latched.dash = false;
    return frame;
  }

  function attachWindowListeners(windowObj, canvasObj) {
    const handleKeyDown = (e) => onKeyDown(e.code, e.repeat);
    const handleKeyUp = (e) => onKeyUp(e.code);
    const handleBlur = () => onBlur();
    const handlePointerDown = (e) => onPointerDown(e.clientX);
    const handlePointerMove = (e) => onPointerMove(e.clientX);
    const handlePointerUp = () => onPointerUp();

    windowObj.addEventListener('keydown', handleKeyDown);
    windowObj.addEventListener('keyup', handleKeyUp);
    windowObj.addEventListener('blur', handleBlur);
    canvasObj.addEventListener('pointerdown', handlePointerDown);
    windowObj.addEventListener('pointermove', handlePointerMove);
    windowObj.addEventListener('pointerup', handlePointerUp);

    return () => {
      windowObj.removeEventListener('keydown', handleKeyDown);
      windowObj.removeEventListener('keyup', handleKeyUp);
      windowObj.removeEventListener('blur', handleBlur);
      canvasObj.removeEventListener('pointerdown', handlePointerDown);
      windowObj.removeEventListener('pointermove', handlePointerMove);
      windowObj.removeEventListener('pointerup', handlePointerUp);
    };
  }

  return {
    onKeyDown,
    onKeyUp,
    onBlur,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    updateCameraYaw,
    consumeTickInput,
    attachWindowListeners,
    setSensitivity,
    setOnPauseToggle,
    getCamYawDeg: () => camYawDeg,
    setCamYawDeg: (deg) => {
      camYawDeg = deg;
    }
  };
}

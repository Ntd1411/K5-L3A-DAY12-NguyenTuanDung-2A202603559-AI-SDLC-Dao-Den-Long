import { DEFAULT_KEY_BINDINGS } from './settings.js';

/**
 * Web input controller that latches discrete action taps (jump, interact, pulse, dash, pause)
 * and supports customizable key bindings.
 */
export function createWebInputController({
  initialYawDeg = 0,
  sensitivity = 1.0,
  keyBindings = DEFAULT_KEY_BINDINGS
} = {}) {
  const keys = new Set();
  const latched = {
    jump: false,
    interact: false,
    pulse: false,
    dash: false
  };

  let bindings = { ...DEFAULT_KEY_BINDINGS, ...keyBindings };
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

  function setKeyBindings(nextBindings) {
    bindings = { ...DEFAULT_KEY_BINDINGS, ...nextBindings };
  }

  function getKeyBindings() {
    return { ...bindings };
  }

  function isActionCode(action, code) {
    if (bindings[action] === code) return true;
    if (action === 'dash' && bindings.dash === 'ShiftLeft' && code === 'ShiftRight') return true;
    if (action === 'pause' && code === 'Escape') return true;
    if (action === 'up' && bindings.up === 'KeyW' && code === 'ArrowUp') return true;
    if (action === 'down' && bindings.down === 'KeyS' && code === 'ArrowDown') return true;
    return false;
  }

  function onKeyDown(code, repeat = false) {
    keys.add(code);
    if (repeat) return;
    if (isActionCode('jump', code)) latched.jump = true;
    if (isActionCode('interact', code)) latched.interact = true;
    if (isActionCode('pulse', code)) latched.pulse = true;
    if (isActionCode('dash', code)) latched.dash = true;
    if (isActionCode('pause', code) && onPauseToggleCallback) {
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

  function isActionHeld(action) {
    if (keys.has(bindings[action])) return true;
    if (action === 'dash' && bindings.dash === 'ShiftLeft' && keys.has('ShiftRight')) return true;
    if (action === 'up' && bindings.up === 'KeyW' && keys.has('ArrowUp')) return true;
    if (action === 'down' && bindings.down === 'KeyS' && keys.has('ArrowDown')) return true;
    return false;
  }

  function consumeTickInput() {
    let mx = 0;
    let mz = 0;
    if (isActionHeld('up')) mz += 1;
    if (isActionHeld('down')) mz -= 1;
    // Screen-right is -X when looking along +Z in Three.js right-handed space
    if (isActionHeld('right')) mx -= 1;
    if (isActionHeld('left')) mx += 1;

    const frame = {
      move: [mx, mz],
      cam_yaw_deg: camYawDeg,
      jump: isActionHeld('jump') || latched.jump,
      interact: isActionHeld('interact') || latched.interact,
      pulse: isActionHeld('pulse') || latched.pulse,
      dash: isActionHeld('dash') || latched.dash
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
    setKeyBindings,
    getKeyBindings,
    setOnPauseToggle,
    getCamYawDeg: () => camYawDeg,
    setCamYawDeg: (deg) => {
      camYawDeg = deg;
    }
  };
}

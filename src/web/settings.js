const STORAGE_KEY = 'dao-den-long-settings';

export const DEFAULT_KEY_BINDINGS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  interact: 'KeyE',
  pulse: 'KeyQ',
  pause: 'KeyP'
};

const DEFAULTS = {
  volume: 0.7,
  sensitivity: 1.0,
  lightMode: false,
  accessiblePalette: false,
  reduceMotion: false,
  largeText: false,
  keyBindings: { ...DEFAULT_KEY_BINDINGS }
};

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
    const parsed = JSON.parse(raw);
    const bindings = { ...DEFAULT_KEY_BINDINGS };
    if (parsed.keyBindings && typeof parsed.keyBindings === 'object') {
      for (const k of Object.keys(DEFAULT_KEY_BINDINGS)) {
        if (typeof parsed.keyBindings[k] === 'string' && parsed.keyBindings[k]) {
          bindings[k] = parsed.keyBindings[k];
        }
      }
    }
    return {
      volume:
        typeof parsed.volume === 'number'
          ? Math.max(0, Math.min(1, parsed.volume))
          : DEFAULTS.volume,
      sensitivity:
        typeof parsed.sensitivity === 'number'
          ? Math.max(0.3, Math.min(2.5, parsed.sensitivity))
          : DEFAULTS.sensitivity,
      lightMode:
        typeof parsed.lightMode === 'boolean' ? parsed.lightMode : DEFAULTS.lightMode,
      accessiblePalette:
        typeof parsed.accessiblePalette === 'boolean'
          ? parsed.accessiblePalette
          : DEFAULTS.accessiblePalette,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULTS.reduceMotion,
      largeText:
        typeof parsed.largeText === 'boolean' ? parsed.largeText : DEFAULTS.largeText,
      keyBindings: bindings
    };
  } catch {
    return { ...DEFAULTS, keyBindings: { ...DEFAULT_KEY_BINDINGS } };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors in restricted environments
  }
}

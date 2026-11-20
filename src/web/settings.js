const STORAGE_KEY = 'dao-den-long-settings';

const DEFAULTS = {
  volume: 0.7,
  sensitivity: 1.0,
  lightMode: false,
  accessiblePalette: false
};

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
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
          : DEFAULTS.accessiblePalette
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors in restricted environments
  }
}

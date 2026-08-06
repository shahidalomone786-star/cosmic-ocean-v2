export const SINGULARITY_SETTINGS_KEY = 'singularity.settings.v1';
export const SINGULARITY_SETTINGS_VERSION = 1;

export type SettingsCategory = 'general' | 'appearance' | 'chat' | 'voice' | 'ai' | 'notifications' | 'privacy' | 'accessibility' | 'about';
export type Theme = 'light' | 'dark' | 'system';
export type Accent = 'violet' | 'cyan' | 'amber' | 'rose';

export interface SingularitySettings {
  version: number;
  general: { language: string; timezone: string };
  appearance: { theme: Theme; accent: Accent; density: 'comfortable' | 'compact' | 'spacious'; messageWidth: 'narrow' | 'standard' | 'wide'; fontSize: 'small' | 'medium' | 'large' };
  chat: { streamingSpeed: 'steady' | 'fast' | 'instant'; autoScroll: boolean; markdown: boolean; codeWrapping: boolean; math: boolean; messageAnimations: boolean; typingAnimation: boolean; timestamps: boolean };
  voice: { enabled: boolean; voice: string; rate: number; autoplay: boolean; sensitivity: number; noiseSuppression: boolean; echoCancellation: boolean };
  ai: { model: string; reasoning: 'focused' | 'balanced' | 'deep'; responseLength: 'concise' | 'balanced' | 'detailed'; writingStyle: 'precise' | 'conversational' | 'academic'; creativity: 'low' | 'balanced' | 'high'; temperature: number; language: string; customInstructions: string };
  notifications: { keyboardShortcuts: boolean; autofocus: boolean; enterToSend: boolean; shiftEnterNewline: boolean; desktop: boolean };
  accessibility: { reducedMotion: boolean; highContrast: boolean; largeFonts: boolean; keyboardNavigation: boolean; screenReader: boolean };
}

export const DEFAULT_SETTINGS: SingularitySettings = {
  version: SINGULARITY_SETTINGS_VERSION,
  general: { language: 'English', timezone: 'Local time' },
  appearance: { theme: 'dark', accent: 'violet', density: 'comfortable', messageWidth: 'standard', fontSize: 'medium' },
  chat: { streamingSpeed: 'steady', autoScroll: true, markdown: true, codeWrapping: false, math: true, messageAnimations: true, typingAnimation: true, timestamps: false },
  voice: { enabled: true, voice: 'Nova · Neural', rate: 1, autoplay: false, sensitivity: 62, noiseSuppression: true, echoCancellation: true },
  ai: { model: 'GPT-OSS-120B', reasoning: 'deep', responseLength: 'balanced', writingStyle: 'precise', creativity: 'balanced', temperature: 0.7, language: 'English', customInstructions: '' },
  notifications: { keyboardShortcuts: true, autofocus: true, enterToSend: true, shiftEnterNewline: true, desktop: false },
  accessibility: { reducedMotion: false, highContrast: false, largeFonts: false, keyboardNavigation: true, screenReader: false },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeSettings(value: unknown): SingularitySettings {
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  const result = { ...DEFAULT_SETTINGS } as SingularitySettings;
  for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof SingularitySettings>) {
    if (isRecord(value[key])) result[key] = { ...(DEFAULT_SETTINGS[key] as object), ...value[key] } as never;
  }
  result.version = SINGULARITY_SETTINGS_VERSION;
  return result;
}

export function loadSingularitySettings(): SingularitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SINGULARITY_SETTINGS_KEY);
    return raw ? mergeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSingularitySettings(settings: SingularitySettings): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SINGULARITY_SETTINGS_KEY, JSON.stringify({ ...settings, version: SINGULARITY_SETTINGS_VERSION })); } catch { /* private browsing can deny storage */ }
}

export function clearPreferenceStore(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(SINGULARITY_SETTINGS_KEY); } catch { /* best effort */ }
}
export type SingularityMode = 'pro' | 'max' | 'flash' | 'research';
export type SingularityEvidenceLevel = 'high' | 'medium' | 'low' | 'not-assessed';

export type SingularityResponseMetadata =
  | { kind: 'followups'; questions: string[] }
  | {
      kind: 'evidence';
      confidence: Exclude<SingularityEvidenceLevel, 'not-assessed'>;
      assumptions: string[];
      evidenceQuality: SingularityEvidenceLevel;
      uncertainty: string;
    };

export interface SingularityModeOption {
  id: SingularityMode;
  name: string;
  description: string;
  shortLabel: string;
}

export const SINGULARITY_MODE_STORAGE_KEY = 'cosmos.singularity.mode.v1';

export const SINGULARITY_MODES: readonly SingularityModeOption[] = [
  {
    id: 'pro',
    name: 'SINGULARITY PRO',
    shortLabel: 'Pro',
    description: 'Full intelligence & full context',
  },
  {
    id: 'max',
    name: 'SINGULARITY MAX',
    shortLabel: 'Max',
    description: 'Deep, extended responses',
  },
  {
    id: 'flash',
    name: 'SINGULARITY FLASH',
    shortLabel: 'Flash',
    description: 'Fast & concise',
  },
  {
    id: 'research',
    name: 'SINGULARITY RESEARCH',
    shortLabel: 'Research',
    description: 'Rigorous analysis & evidence',
  },
];

export const DEFAULT_SINGULARITY_MODE: SingularityMode = 'pro';

export function isSingularityMode(value: unknown): value is SingularityMode {
  return value === 'pro' || value === 'max' || value === 'flash' || value === 'research';
}

export function loadSingularityMode(): SingularityMode {
  if (typeof window === 'undefined') return DEFAULT_SINGULARITY_MODE;
  try {
    const stored = window.localStorage.getItem(SINGULARITY_MODE_STORAGE_KEY);
    return isSingularityMode(stored) ? stored : DEFAULT_SINGULARITY_MODE;
  } catch {
    return DEFAULT_SINGULARITY_MODE;
  }
}

export function saveSingularityMode(mode: SingularityMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SINGULARITY_MODE_STORAGE_KEY, mode);
  } catch {
    // Private browsing or a full storage quota must not interrupt chat.
  }
}
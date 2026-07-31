/**
 * useSavedPapers — localStorage-backed reading list hook
 *
 * Key: cosmos_saved_papers
 * Dedup: item.id → item.url → composite fallback
 * Graceful degradation: all storage errors are swallowed silently
 */

import { useState, useCallback, useMemo } from 'react';
import type { SectionItem } from '../components/NasaSearch';

const LS_KEY = 'cosmos_saved_papers';

/** Build a stable dedup key from a SectionItem */
export function stableItemId(item: SectionItem): string {
  if (item.id)  return item.id;
  if (item.url) return item.url;
  return `${item.source}::${item.title}`;
}

function loadFromStorage(): SectionItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Minimal shape-check — drop obviously broken entries
    return (parsed as unknown[]).filter(
      (x): x is SectionItem =>
        typeof x === 'object' && x !== null &&
        typeof (x as Record<string, unknown>).id === 'string' &&
        typeof (x as Record<string, unknown>).title === 'string',
    );
  } catch {
    return [];
  }
}

function persist(items: SectionItem[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or storage unavailable — silently no-op
  }
}

export interface UseSavedPapersReturn {
  saved:       SectionItem[];
  savedIdSet:  ReadonlySet<string>;
  toggleSave:  (item: SectionItem) => void;
  remove:      (item: SectionItem) => void;
  clearAll:    () => void;
}

export function useSavedPapers(): UseSavedPapersReturn {
  const [saved, setSaved] = useState<SectionItem[]>(loadFromStorage);

  // O(1) membership — new Set only when `saved` reference changes
  const savedIdSet = useMemo(
    () => new Set(saved.map(stableItemId)) as ReadonlySet<string>,
    [saved],
  );

  const toggleSave = useCallback((item: SectionItem) => {
    const key = stableItemId(item);
    setSaved(prev => {
      const next = prev.some(p => stableItemId(p) === key)
        ? prev.filter(p => stableItemId(p) !== key)
        : [{ ...item }, ...prev];
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((item: SectionItem) => {
    setSaved(prev => {
      const next = prev.filter(p => stableItemId(p) !== stableItemId(item));
      persist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSaved([]);
    persist([]);
  }, []);

  return { saved, savedIdSet, toggleSave, remove, clearAll };
}

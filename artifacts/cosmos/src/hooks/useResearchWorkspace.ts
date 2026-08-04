/**
 * useResearchWorkspace — localStorage-backed research workspace hook
 *
 * Key: cosmos_research_workspace_v1
 * Covers: Collections, Reading Status, Notes (auto-save), Favorites
 * No backend — all data is local.
 */

import { useState, useCallback, useMemo } from 'react';

const WS_KEY = 'cosmos_research_workspace_v1';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ReadStatus = 'unread' | 'reading' | 'read';

export interface PaperMeta {
  readStatus:   ReadStatus;
  lastOpened:   number | null;   // ms timestamp
  note:         string;
  noteEditedAt: number | null;   // ms timestamp
  isFavorite:   boolean;
  collectionIds: string[];
}

export interface Collection {
  id:        string;
  name:      string;
  color:     string;   // one of COLLECTION_COLOR_KEYS
  createdAt: number;
}

// ─── Internal shape ───────────────────────────────────────────────────────────

interface WorkspaceData {
  collections: Collection[];
  paperMeta:   Record<string, PaperMeta>;
}

// ─── Stable default (export so drawer can reference it without importing hook state) ─
export const DEFAULT_PAPER_META: Readonly<PaperMeta> = {
  readStatus:   'unread',
  lastOpened:   null,
  note:         '',
  noteEditedAt: null,
  isFavorite:   false,
  collectionIds: [],
};

const STATUS_CYCLE: Record<ReadStatus, ReadStatus> = {
  unread:  'reading',
  reading: 'read',
  read:    'unread',
};

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadWorkspace(): WorkspaceData {
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (!raw) return { collections: [], paperMeta: {} };
    const p = JSON.parse(raw) as Partial<WorkspaceData>;
    return {
      collections: Array.isArray(p.collections) ? p.collections : [],
      paperMeta:
        p.paperMeta && typeof p.paperMeta === 'object' && !Array.isArray(p.paperMeta)
          ? (p.paperMeta as Record<string, PaperMeta>)
          : {},
    };
  } catch {
    return { collections: [], paperMeta: {} };
  }
}

function saveWorkspace(data: WorkspaceData): void {
  try { localStorage.setItem(WS_KEY, JSON.stringify(data)); } catch { /* quota / unavailable */ }
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseResearchWorkspaceReturn {
  collections:        Collection[];
  paperMeta:          Record<string, PaperMeta>;   // direct access for memo-safe prop passing
  cycleReadStatus:    (paperId: string) => void;
  touchLastOpened:    (paperId: string) => void;
  setNote:            (paperId: string, note: string) => void;
  toggleFavorite:     (paperId: string) => void;
  addToCollection:    (paperId: string, collectionId: string) => void;
  removeFromCollection: (paperId: string, collectionId: string) => void;
  createCollection:   (name: string, color: string) => Collection;
  deleteCollection:   (id: string) => void;
  favoritePaperIds:   ReadonlySet<string>;
  collectionPaperCount: (collectionId: string) => number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useResearchWorkspace(): UseResearchWorkspaceReturn {
  const [workspace, setWorkspace] = useState<WorkspaceData>(loadWorkspace);

  // Single stable updater — uses functional setState so never goes stale
  const update = useCallback((fn: (prev: WorkspaceData) => WorkspaceData): void => {
    setWorkspace(prev => {
      const next = fn(prev);
      saveWorkspace(next);
      return next;
    });
  }, []);

  const cycleReadStatus = useCallback((paperId: string) => {
    update(prev => {
      const cur = prev.paperMeta[paperId] ?? { ...DEFAULT_PAPER_META };
      return {
        ...prev,
        paperMeta: { ...prev.paperMeta, [paperId]: { ...cur, readStatus: STATUS_CYCLE[cur.readStatus] } },
      };
    });
  }, [update]);

  const touchLastOpened = useCallback((paperId: string) => {
    update(prev => {
      const cur = prev.paperMeta[paperId] ?? { ...DEFAULT_PAPER_META };
      return {
        ...prev,
        paperMeta: { ...prev.paperMeta, [paperId]: { ...cur, lastOpened: Date.now() } },
      };
    });
  }, [update]);

  const setNote = useCallback((paperId: string, note: string) => {
    update(prev => {
      const cur = prev.paperMeta[paperId] ?? { ...DEFAULT_PAPER_META };
      return {
        ...prev,
        paperMeta: { ...prev.paperMeta, [paperId]: { ...cur, note, noteEditedAt: Date.now() } },
      };
    });
  }, [update]);

  const toggleFavorite = useCallback((paperId: string) => {
    update(prev => {
      const cur = prev.paperMeta[paperId] ?? { ...DEFAULT_PAPER_META };
      return {
        ...prev,
        paperMeta: { ...prev.paperMeta, [paperId]: { ...cur, isFavorite: !cur.isFavorite } },
      };
    });
  }, [update]);

  const addToCollection = useCallback((paperId: string, collectionId: string) => {
    update(prev => {
      const cur = prev.paperMeta[paperId] ?? { ...DEFAULT_PAPER_META };
      if (cur.collectionIds.includes(collectionId)) return prev;
      return {
        ...prev,
        paperMeta: {
          ...prev.paperMeta,
          [paperId]: { ...cur, collectionIds: [...cur.collectionIds, collectionId] },
        },
      };
    });
  }, [update]);

  const removeFromCollection = useCallback((paperId: string, collectionId: string) => {
    update(prev => {
      const cur = prev.paperMeta[paperId] ?? { ...DEFAULT_PAPER_META };
      return {
        ...prev,
        paperMeta: {
          ...prev.paperMeta,
          [paperId]: { ...cur, collectionIds: cur.collectionIds.filter(id => id !== collectionId) },
        },
      };
    });
  }, [update]);

  const createCollection = useCallback((name: string, color: string): Collection => {
    const col: Collection = {
      id:        `col_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name:      name.trim() || 'New Collection',
      color,
      createdAt: Date.now(),
    };
    update(prev => ({ ...prev, collections: [...prev.collections, col] }));
    return col;
  }, [update]);

  const deleteCollection = useCallback((id: string) => {
    update(prev => ({
      collections: prev.collections.filter(c => c.id !== id),
      paperMeta:   Object.fromEntries(
        Object.entries(prev.paperMeta).map(([pid, meta]) => [
          pid,
          { ...meta, collectionIds: meta.collectionIds.filter(cid => cid !== id) },
        ]),
      ),
    }));
  }, [update]);

  const favoritePaperIds = useMemo<ReadonlySet<string>>(
    () => new Set(
      Object.entries(workspace.paperMeta)
        .filter(([, m]) => m.isFavorite)
        .map(([id]) => id),
    ),
    [workspace.paperMeta],
  );

  const collectionPaperCount = useCallback((collectionId: string): number => {
    return Object.values(workspace.paperMeta).filter(m => m.collectionIds.includes(collectionId)).length;
  }, [workspace.paperMeta]);

  return {
    collections:          workspace.collections,
    paperMeta:            workspace.paperMeta,
    cycleReadStatus,
    touchLastOpened,
    setNote,
    toggleFavorite,
    addToCollection,
    removeFromCollection,
    createCollection,
    deleteCollection,
    favoritePaperIds,
    collectionPaperCount,
  };
}

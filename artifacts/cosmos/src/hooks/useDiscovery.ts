/**
 * useDiscovery — fetches discovery data from the three backend endpoints
 * (/api/discovery/topics, /api/discovery/authors, /api/discovery/connections)
 * debounced by 450 ms to avoid hammering the API on rapid query changes.
 *
 * Respects AbortController — in-flight requests are cancelled when the
 * query changes or the component unmounts.  Individual fetch failures return
 * empty arrays so a slow source never blocks the rest.
 */

import { useState, useEffect, useRef } from 'react';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface DiscoveryTopic {
  label: string;
  query: string;
  source: string;
  confidence: number;
}

export interface DiscoveryAuthor {
  name: string;
  source: string;
  paperCount?: number;
  citationCount?: number;
  hIndex?: number;
  profileUrl?: string;
  confidence: number;
}

export interface DiscoveryConnection {
  concept: string;
  relatedTo: string;
  relationType: string;
  source: string;
}

export interface DiscoveryData {
  topics: DiscoveryTopic[];
  authors: DiscoveryAuthor[];
  connections: DiscoveryConnection[];
  loading: boolean;
}

const EMPTY: DiscoveryData = {
  topics: [],
  authors: [],
  connections: [],
  loading: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDiscovery(query: string | undefined): DiscoveryData {
  const [data, setData] = useState<DiscoveryData>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = (query ?? '').trim();

    if (!q) {
      setData(EMPTY);
      return;
    }

    // Reset to empty + loading immediately so stale data doesn't show
    setData({ topics: [], authors: [], connections: [], loading: true });

    // Debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const get = async <T,>(path: string): Promise<T | null> => {
        try {
          const r = await fetch(path, { signal: ac.signal });
          if (!r.ok) return null;
          return (await r.json()) as T;
        } catch {
          return null;
        }
      };

      const enc = encodeURIComponent(q);

      const [topicsRes, authorsRes, connectionsRes] = await Promise.all([
        get<{ topics: DiscoveryTopic[] }>(`/api/discovery/topics?q=${enc}`),
        get<{ authors: DiscoveryAuthor[] }>(`/api/discovery/authors?q=${enc}`),
        get<{ connections: DiscoveryConnection[] }>(`/api/discovery/connections?q=${enc}`),
      ]);

      if (ac.signal.aborted) return;

      setData({
        topics:      topicsRes?.topics      ?? [],
        authors:     authorsRes?.authors    ?? [],
        connections: connectionsRes?.connections ?? [],
        loading:     false,
      });
    }, 450);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [query]);

  return data;
}

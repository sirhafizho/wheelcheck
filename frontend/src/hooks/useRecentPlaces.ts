'use client';

import { useCallback, useEffect, useState } from 'react';

export interface RecentPlace {
  id: string;
  name: string;
  category?: string;
  accessibilityLevel?: string | null;
  viewedAt: number;
}

const STORAGE_KEY = 'wheelcheck_recent_places';
const MAX_RECENT = 10;

function loadRecent(): RecentPlace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentPlace[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(places: RecentPlace[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch { /* quota exceeded — silently skip */ }
}

export function useRecentPlaces() {
  const [recent, setRecent] = useState<RecentPlace[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const addRecent = useCallback(
    (place: Omit<RecentPlace, 'viewedAt'>) => {
      setRecent((prev) => {
        const filtered = prev.filter((p) => p.id !== place.id);
        const next = [{ ...place, viewedAt: Date.now() }, ...filtered].slice(0, MAX_RECENT);
        saveRecent(next);
        return next;
      });
    },
    []
  );

  return { recent, addRecent };
}

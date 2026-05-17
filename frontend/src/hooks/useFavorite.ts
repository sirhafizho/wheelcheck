'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wheelcheck_token');
}

export function useFavorite(placeId: string) {
  const [favorited, setFavorited] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    api.getFavoriteStatus(placeId, token ?? undefined)
      .then((status) => {
        if (!cancelled) {
          setFavorited(status.favorited);
          setTotalFavorites(status.totalFavorites);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => { cancelled = true; };
  }, [placeId]);

  const toggle = useCallback(async () => {
    const token = getToken();
    if (!token) return false; // caller should show login prompt
    setLoading(true);
    try {
      const result = await api.toggleFavorite(placeId, token);
      setFavorited(result.favorited);
      setTotalFavorites(result.totalFavorites);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  return { favorited, totalFavorites, toggle, loading, initialLoading };
}

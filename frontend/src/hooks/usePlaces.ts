'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Place, PlaceSearchParams } from '@/lib/types';

export function usePlaces(initialParams?: PlaceSearchParams) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Stabilize initialParams to avoid infinite re-render loops
  const paramsRef = useRef(initialParams);
  const paramsKey = JSON.stringify(initialParams);

  useEffect(() => {
    paramsRef.current = initialParams;
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPlaces = useCallback(async (params?: PlaceSearchParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.searchPlaces(params || paramsRef.current || {});
      setPlaces(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch places');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads from ref

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces, paramsKey]); // re-fetch when params actually change

  return {
    places,
    loading,
    error,
    total,
    refetch: fetchPlaces,
  };
}

export function usePlace(id: string) {
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPlace = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.getPlace(id);
        setPlace(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch place');
        setPlace(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlace();
  }, [id]);

  return { place, loading, error };
}

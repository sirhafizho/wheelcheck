'use client';

import { useState, useEffect, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const serialized = JSON.stringify(value);
  const prevSerialized = useRef(serialized);

  useEffect(() => {
    // Only set timer if value actually changed (deep compare via JSON)
    if (prevSerialized.current === serialized) return;
    prevSerialized.current = serialized;

    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [serialized, delay]); // eslint-disable-line react-hooks/exhaustive-deps

  return debouncedValue;
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_URL } from '@/lib/constants';
import { getBackendStatus, setBackendStatus, subscribeBackendStatus, type BackendStatus } from '@/lib/backendStatus';

const POLL_INTERVAL = 15; // seconds between health checks when booting

async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/places?page=0&size=1`, { signal: AbortSignal.timeout(8000) });
    if (res.status === 503 || res.status === 502) {
      setBackendStatus('booting');
      return false;
    }
    if (res.ok) {
      setBackendStatus('online');
      return true;
    }
    return false;
  } catch {
    setBackendStatus('booting');
    return false;
  }
}

export function BackendStatusBanner() {
  const [status, setStatus] = useState<BackendStatus>(getBackendStatus);
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const [checking, setChecking] = useState(false);

  // Subscribe to status changes from ApiClient
  useEffect(() => {
    return subscribeBackendStatus(setStatus);
  }, []);

  // On mount, do an immediate health check
  useEffect(() => {
    pingBackend();
  }, []);

  // When booting: run countdown and re-ping when it hits 0
  useEffect(() => {
    if (status !== 'booting') return;

    setCountdown(POLL_INTERVAL);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setChecking(true);
          pingBackend().finally(() => setChecking(false));
          return POLL_INTERVAL;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const handleRetryNow = useCallback(() => {
    setChecking(true);
    setCountdown(POLL_INTERVAL);
    pingBackend().finally(() => setChecking(false));
  }, []);

  if (status === 'unknown' || status === 'online') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        flex items-center gap-3 px-4 py-2.5
        bg-sky-50 dark:bg-sky-950
        border-b border-sky-200 dark:border-sky-800
        text-sky-800 dark:text-sky-200
        text-sm
      "
    >
      {/* Spinner */}
      <svg
        className="shrink-0 h-4 w-4 animate-spin text-sky-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>

      {/* Message */}
      <span className="flex-1">
        <strong className="font-semibold">Backend is warming up</strong>
        {' — '}
        the server goes to sleep after inactivity. Data will load once it&apos;s ready.
      </span>

      {/* Countdown / retry */}
      <button
        onClick={handleRetryNow}
        disabled={checking}
        className="
          shrink-0 text-xs font-medium
          px-2.5 py-1 rounded-full
          bg-sky-100 dark:bg-sky-900
          hover:bg-sky-200 dark:hover:bg-sky-800
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
        aria-label="Retry connection now"
      >
        {checking ? 'Checking…' : `Retry in ${countdown}s`}
      </button>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { CheckCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 2500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-gray-700 text-white',
  };

  const Icon = type === 'info' ? InformationCircleIcon : CheckCircleIcon;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast"
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg text-sm font-medium animate-fade-in ${colors[type]}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="ml-1 rounded-full p-0.5 hover:opacity-80 transition-opacity"
      >
        <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
}

const CLOSE_THRESHOLD = 80;
const TRANSITION = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)';

export function BottomSheet({ open, onClose, children, ariaLabel = 'Details' }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  // Mount on open, unmount after close animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Start offscreen then slide up
      setTranslateY(window.innerHeight);
      requestAnimationFrame(() => setTranslateY(0));
    } else {
      setTranslateY(window.innerHeight);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setTranslateY(Math.max(0, e.clientY - startYRef.current));
  }, [dragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    setDragging(false);
    const delta = e.clientY - startYRef.current;
    if (delta > CLOSE_THRESHOLD) {
      onClose();
    } else {
      setTranslateY(0);
    }
  }, [onClose]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        data-testid="bottom-sheet-backdrop"
        className="fixed inset-0 z-[1090] bg-black/40"
        style={{ transition: 'opacity 0.3s', opacity: translateY > 0 ? 0.3 : 1 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-testid="bottom-sheet"
        className="fixed inset-x-0 bottom-0 z-[1100] flex flex-col bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl"
        style={{
          maxHeight: '88dvh',
          transform: `translateY(${translateY}px)`,
          transition: dragging ? 'none' : TRANSITION,
        }}
      >
        {/* Drag handle */}
        <div
          className="flex shrink-0 cursor-grab touch-none items-center justify-center py-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="button"
          aria-label="Drag to close"
        >
          <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
          {children}
        </div>
      </div>
    </>
  );
}

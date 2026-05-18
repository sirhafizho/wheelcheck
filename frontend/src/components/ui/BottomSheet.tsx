'use client';

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type BottomSheetState = 'collapsed' | 'half' | 'full';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  peekHeight?: number;
  initialState?: BottomSheetState;
  ariaLabel?: string;
}

const MAX_HEIGHT_RATIO = 0.9;
const HALF_HEIGHT_RATIO = 0.5;
const DEFAULT_PEEK_HEIGHT = 120;
const CLOSE_THRESHOLD = 72;
const TRANSITION_DURATION_MS = 280;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BottomSheet({
  open,
  onClose,
  children,
  className = '',
  peekHeight = DEFAULT_PEEK_HEIGHT,
  initialState = 'collapsed',
  ariaLabel = 'Bottom sheet',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startY: number; startTranslate: number } | null>(null);
  const translateYRef = useRef(0);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeState, setActiveState] = useState<BottomSheetState>(initialState);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  const setSheetTranslate = useCallback((value: number) => {
    translateYRef.current = value;
    setTranslateY(value);
  }, []);

  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  }, []);

  const snapPoints = useMemo(() => {
    const resolvedViewportHeight = viewportHeight || 800;
    const maxHeight = resolvedViewportHeight * MAX_HEIGHT_RATIO;

    return {
      maxHeight,
      full: 0,
      half: Math.max(maxHeight - resolvedViewportHeight * HALF_HEIGHT_RATIO, 0),
      collapsed: Math.max(maxHeight - peekHeight, 0),
      hidden: maxHeight + 24,
    };
  }, [peekHeight, viewportHeight]);

  const snapToState = useCallback((nextState: BottomSheetState) => {
    setActiveState(nextState);
    setSheetTranslate(snapPoints[nextState]);
  }, [setSheetTranslate, snapPoints]);

  const requestClose = useCallback(() => {
    if (!isVisible) {
      return;
    }

    setIsDragging(false);
    setIsVisible(false);
    setSheetTranslate(snapPoints.hidden);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, TRANSITION_DURATION_MS);
  }, [isVisible, onClose, setSheetTranslate, snapPoints.hidden]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    setActiveState(initialState);
    setSheetTranslate(snapPoints.hidden);

    const animationFrame = window.requestAnimationFrame(() => {
      setSheetTranslate(snapPoints[initialState]);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [initialState, open, setSheetTranslate, snapPoints, snapPoints.hidden]);

  useEffect(() => {
    if (!open || !isVisible || isDragging) {
      return;
    }

    setSheetTranslate(snapPoints[activeState]);
  }, [activeState, isDragging, isVisible, open, setSheetTranslate, snapPoints]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open || !isVisible) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, open, requestClose]);

  useEffect(() => {
    const shouldListenForOutsideClicks = open && isVisible && translateY < snapPoints.collapsed - 8;

    if (!shouldListenForOutsideClicks) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node) || sheetRef.current?.contains(target)) {
        return;
      }

      requestClose();
    };

    document.addEventListener('click', handleDocumentClick, true);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isVisible, open, requestClose, snapPoints.collapsed, translateY]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStateRef.current = {
      startY: event.clientY,
      startTranslate: translateYRef.current,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current) {
      return;
    }

    const deltaY = event.clientY - dragStateRef.current.startY;
    setSheetTranslate(clamp(dragStateRef.current.startTranslate + deltaY, snapPoints.full, snapPoints.hidden));
  };

  const handlePointerEnd = () => {
    if (!dragStateRef.current) {
      return;
    }

    const currentTranslate = translateYRef.current;
    dragStateRef.current = null;
    setIsDragging(false);

    if (currentTranslate >= snapPoints.collapsed + CLOSE_THRESHOLD) {
      requestClose();
      return;
    }

    const nearestState = (['full', 'half', 'collapsed'] as BottomSheetState[]).reduce((closestState, state) => {
      const currentDistance = Math.abs(snapPoints[state] - currentTranslate);
      const closestDistance = Math.abs(snapPoints[closestState] - currentTranslate);

      return currentDistance < closestDistance ? state : closestState;
    }, 'collapsed');

    snapToState(nearestState);
  };

  if (!open && !isVisible) {
    return null;
  }

  const backdropOpacity = clamp(
    1 - translateY / Math.max(snapPoints.collapsed, 1),
    0,
    1,
  );

  return (
    <>
      <div
        aria-hidden="true"
        data-testid="bottom-sheet-backdrop"
        className="fixed inset-0 z-[1090] bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-none"
        style={{ opacity: backdropOpacity }}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1100] px-2 pb-2 sm:px-4">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="false"
          aria-label={ariaLabel}
          data-testid="bottom-sheet"
          className={`pointer-events-auto mx-auto flex w-full max-w-screen-md flex-col overflow-hidden rounded-t-3xl bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl ${className}`}
          style={{
            height: `${snapPoints.maxHeight}px`,
            transform: `translateY(${translateY}px)`,
            transition: isDragging ? 'none' : `transform ${TRANSITION_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            willChange: 'transform',
          }}
        >
          <button
            type="button"
            className="flex w-full cursor-grab touch-none flex-col items-center gap-3 px-4 pb-3 pt-3 active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            aria-label="Drag place details"
          >
            <span className="h-1.5 w-14 rounded-full bg-gray-300" />
            <span className="sr-only">Drag to expand or close</span>
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = document.querySelector('[data-scroll-container]') || window;
    const handleScroll = () => {
      const scrollY = container === window
        ? window.scrollY
        : (container as HTMLElement).scrollTop;
      setVisible(scrollY > 400);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const container = document.querySelector('[data-scroll-container]');
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
      className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur-sm text-gray-600 hover:text-emerald-600 hover:bg-white transition-all sm:bottom-6 sm:right-6"
      aria-label="Scroll to top"
    >
      <ChevronUpIcon className="h-5 w-5" />
    </button>
  );
}

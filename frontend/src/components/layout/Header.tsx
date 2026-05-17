'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bars3Icon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  locale: string;
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations('common');
  const ta = useTranslations('accessibility');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const newValue = !isDark;
    setIsDark(newValue);
    localStorage.setItem('wheelcheck_dark_mode', String(newValue));
    document.documentElement.classList.toggle('dark', newValue);
  };

  return (
    <header className="bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link 
            href={`/${locale}`}
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md px-2 py-1"
          >
            <span className="text-2xl" aria-hidden="true">♿</span>
            <span className="text-lg font-bold text-emerald-600 tracking-tight">
              {t('appName')}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {isDark
                ? <SunIcon className="w-5 h-5" aria-hidden="true" />
                : <MoonIcon className="w-5 h-5" aria-hidden="true" />
              }
            </button>
            <LanguageToggle currentLocale={locale} />
          </div>
        </div>
      </div>

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only
          focus:absolute focus:top-4 focus:left-4
          bg-emerald-600 text-white px-4 py-2 rounded-md
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
          z-[100]
        "
      >
        {ta('skipToContent')}
      </a>
    </header>
  );
}

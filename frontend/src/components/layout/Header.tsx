'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  locale: string;
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations('common');

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link 
            href={`/${locale}`}
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md px-2 py-1"
          >
            <div className="text-2xl" aria-hidden="true">♿</div>
            <span className="text-xl font-bold text-emerald-600">
              {t('appName')}
            </span>
          </Link>

          <div className="flex items-center gap-4">
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
        {t('accessibility.skipToContent')}
      </a>
    </header>
  );
}

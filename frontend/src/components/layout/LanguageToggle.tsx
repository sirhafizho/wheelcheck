'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageIcon } from '@heroicons/react/24/outline';

interface LanguageToggleProps {
  currentLocale: string;
}

export function LanguageToggle({ currentLocale }: LanguageToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('accessibility');

  const toggleLocale = () => {
    const newLocale = currentLocale === 'en' ? 'ms' : 'en';
    const newPath = pathname?.replace(`/${currentLocale}`, `/${newLocale}`) || `/${newLocale}`;
    router.push(newPath);
  };

  const getLocaleName = (locale: string) => {
    return locale === 'en' ? 'English' : 'Bahasa Malaysia';
  };

  return (
    <button
      onClick={toggleLocale}
      className="
        flex items-center gap-2 px-3 py-2 rounded-lg
        text-gray-700 hover:bg-gray-100
        focus:outline-none focus:ring-2 focus:ring-emerald-500
        transition-colors duration-200
        min-h-[44px]
      "
      aria-label={t('languageToggle')}
      title={`Switch to ${getLocaleName(currentLocale === 'en' ? 'ms' : 'en')}`}
    >
      <LanguageIcon className="w-5 h-5" aria-hidden="true" />
      <span className="text-sm font-medium">
        {currentLocale.toUpperCase()}
      </span>
    </button>
  );
}

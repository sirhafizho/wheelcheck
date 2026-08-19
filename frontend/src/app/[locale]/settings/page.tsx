'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

type Params = Promise<{ locale: string }>;

interface TokenPayload {
  role?: string;
}

const parseToken = (token: string): TokenPayload | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
};

export default function SettingsPage({ params }: { params: Params }) {
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations('settings');
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const storedHighContrast = localStorage.getItem('wheelcheck_high_contrast') === 'true';
    const storedLargeText = localStorage.getItem('wheelcheck_large_text') === 'true';
    const storedDarkMode = localStorage.getItem('wheelcheck_dark_mode') === 'true';
    const token = localStorage.getItem('wheelcheck_token');
    const tokenPayload = token ? parseToken(token) : null;

    setHighContrast(storedHighContrast);
    setLargeText(storedLargeText);
    setDarkMode(storedDarkMode);
    setIsAdmin(tokenPayload?.role?.toUpperCase() === 'ADMIN');
    document.documentElement.classList.toggle('high-contrast', storedHighContrast);
    document.documentElement.classList.toggle('large-text', storedLargeText);
    document.documentElement.classList.toggle('dark', storedDarkMode);
  }, []);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('wheelcheck_high_contrast', String(newValue));
    document.documentElement.classList.toggle('high-contrast', newValue);
  };

  const toggleLargeText = () => {
    const newValue = !largeText;
    setLargeText(newValue);
    localStorage.setItem('wheelcheck_large_text', String(newValue));
    document.documentElement.classList.toggle('large-text', newValue);
  };

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem('wheelcheck_dark_mode', String(newValue));
    document.documentElement.classList.toggle('dark', newValue);
  };

  const switchLanguage = () => {
    const newLocale = locale === 'en' ? 'ms' : 'en';
    router.push(`/${newLocale}/settings`);
  };

  return (
    <div className="h-full overflow-y-auto pb-16">
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('language')}</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-700">
              {t('currentLanguage')}: {locale === 'en' ? t('english') : t('bahasaMalaysia')}
            </span>
            <Button variant="outline" onClick={switchLanguage} className="min-h-[48px] sm:w-auto">
              {t('switchTo')} {locale === 'en' ? t('bahasaMalaysia') : t('english')}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('accessibility')}</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer min-h-[48px] gap-4">
              <span className="text-gray-700">{t('darkMode')}</span>
              <div className="relative shrink-0">
                <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer min-h-[48px] gap-4">
              <span className="text-gray-700">{t('highContrast')}</span>
              <div className="relative shrink-0">
                <input type="checkbox" checked={highContrast} onChange={toggleHighContrast} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer min-h-[48px] gap-4">
              <span className="text-gray-700">{t('largeText')}</span>
              <div className="relative shrink-0">
                <input type="checkbox" checked={largeText} onChange={toggleLargeText} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('about')}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">{t('version')}</dt>
              <dd className="font-medium text-right">1.0.0</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">{t('license')}</dt>
              <dd className="font-medium text-right">Apache 2.0</dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <a
              href="https://github.com/sirhafizho/wheelcheck"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline text-sm font-medium inline-flex items-center min-h-[48px]"
            >
              {t('viewOnGithub')}
            </a>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('administration')}</h2>
            <Link
              href={`/${locale}/admin`}
              className="inline-flex min-h-[48px] items-center text-emerald-600 text-sm font-medium hover:underline"
            >
              {t('adminDashboard')} →
            </Link>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

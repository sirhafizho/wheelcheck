'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

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
    setHighContrast(storedHighContrast);
    setLargeText(storedLargeText);
    setDarkMode(storedDarkMode);
    document.documentElement.classList.toggle('high-contrast', storedHighContrast);
    document.documentElement.classList.toggle('large-text', storedLargeText);
    document.documentElement.classList.toggle('dark', storedDarkMode);

    createClient().auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token ?? null;
      const tokenPayload = token ? parseToken(token) : null;
      setIsAdmin(tokenPayload?.role?.toUpperCase() === 'ADMIN');
    });
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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('title')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">Customize your WheelCheck experience</p>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-5 lg:space-y-0">
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">🌐 {t('language')}</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-700">
              {t('currentLanguage')}: {locale === 'en' ? t('english') : t('bahasaMalaysia')}
            </span>
            <Button variant="outline" onClick={switchLanguage} className="min-h-[48px] sm:w-auto">
              {t('switchTo')} {locale === 'en' ? t('bahasaMalaysia') : t('english')}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">♿ {t('accessibility')}</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer min-h-[48px] gap-4">
              <div className="flex flex-col">
                <span className="text-gray-700">{t('darkMode')}</span>
                <span className="text-xs text-gray-400">Reduce eye strain in low light</span>
              </div>
              <div className="relative shrink-0">
                <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer min-h-[48px] gap-4">
              <div className="flex flex-col">
                <span className="text-gray-700">{t('highContrast')}</span>
                <span className="text-xs text-gray-400">Increase color contrast for better visibility</span>
              </div>
              <div className="relative shrink-0">
                <input type="checkbox" checked={highContrast} onChange={toggleHighContrast} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer min-h-[48px] gap-4">
              <div className="flex flex-col">
                <span className="text-gray-700">{t('largeText')}</span>
                <span className="text-xs text-gray-400">Enlarge text for easier reading</span>
              </div>
              <div className="relative shrink-0">
                <input type="checkbox" checked={largeText} onChange={toggleLargeText} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer-checked:bg-emerald-600 transition-colors"></div>
                <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-full"></div>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">ℹ️ {t('about')}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 items-center">
              <dt className="text-gray-600">{t('version')}</dt>
              <dd><span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">1.0.0</span></dd>
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
              className="text-emerald-600 hover:underline text-sm font-medium inline-flex items-center gap-1.5 min-h-[48px]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              {t('viewOnGithub')}
            </a>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">🔧 {t('administration')}</h2>
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

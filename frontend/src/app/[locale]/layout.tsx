import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackendStatusBanner } from '@/components/ui/BackendStatusBanner';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Params = Promise<{ locale: string }>;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { locale: rawLocale } = await params;
  const locale = locales.includes(rawLocale as any) ? rawLocale : 'en';

  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full overflow-hidden">
      <head>
        {/* Anti-FOUC: apply dark/contrast/large-text before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;var dm=localStorage.getItem('wheelcheck_dark_mode');var hc=localStorage.getItem('wheelcheck_high_contrast');var lt=localStorage.getItem('wheelcheck_large_text');if(dm==='true')d.classList.add('dark');if(hc==='true')d.classList.add('high-contrast');if(lt==='true')d.classList.add('large-text');}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#059669" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="h-full flex flex-col overflow-hidden bg-gray-50">
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <BackendStatusBanner />
          <main id="main-content" className="flex-1 min-h-0 overflow-hidden">
            {children}
          </main>
          <BottomNav locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';

const SITE_URL = 'https://wheelcheck-swart.vercel.app';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;

  const title = 'WheelCheck - Find Accessible Places in Malaysia';
  const description = locale === 'ms' 
    ? 'Temui tempat mesra kerusi roda di seluruh Malaysia. 71,000+ lokasi dengan ulasan aksesibiliti komuniti.'
    : 'Discover wheelchair-friendly venues across Malaysia. 71,000+ places with community accessibility reviews.';

  return {
    title,
    description,
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      type: 'website',
      locale: locale === 'ms' ? 'ms_MY' : 'en_US',
      url: SITE_URL,
      siteName: 'WheelCheck',
      title,
      description,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'WheelCheck - Find Wheelchair-Accessible Places Across Malaysia',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/twitter-image.png`],
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': 'WheelCheck',
    },
  };
}

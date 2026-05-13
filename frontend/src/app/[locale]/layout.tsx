import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="h-full flex flex-col overflow-hidden bg-gray-50">
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <main id="main-content" className="flex-1 min-h-0 overflow-hidden">
            {children}
          </main>
          <BottomNav locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;
  
  return {
    title: 'WheelCheck - Find Accessible Places',
    description: locale === 'ms' 
      ? 'Temui tempat mesra kerusi roda di seluruh Malaysia'
      : 'Discover wheelchair-friendly venues across Malaysia',
    manifest: '/manifest.json',
  };
}

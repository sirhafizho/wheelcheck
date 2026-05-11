'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { usePlaces } from '@/hooks/usePlaces';
import { useDebounce } from '@/hooks/useDebounce';
import { PlaceCard } from '@/components/places/PlaceCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SearchInput } from '@/components/ui/SearchInput';

type Params = Promise<{ locale: string }>;

interface PlacesPageProps {
  params: Params;
}

export default function PlacesPage({ params }: PlacesPageProps) {
  const { locale } = use(params);
  const t = useTranslations('places');
  const tAddPlace = useTranslations('addPlace');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);
  const { places, loading, error } = usePlaces(
    debouncedSearch ? { query: debouncedSearch } : undefined
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <Link
          href={`/${locale}/add-place`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[48px]"
        >
          <PlusIcon className="w-5 h-5" aria-hidden="true" />
          <span>{tAddPlace('title')}</span>
        </Link>
      </div>

      <div className="mb-6">
        <SearchInput
          placeholder={t('searchPlaceholder') || 'Search places...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {places.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

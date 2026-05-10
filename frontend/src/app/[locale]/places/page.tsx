'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { usePlaces } from '@/hooks/usePlaces';
import { PlaceCard } from '@/components/places/PlaceCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SearchInput } from '@/components/ui/SearchInput';
import { useState } from 'react';

type Params = Promise<{ locale: string }>;

interface PlacesPageProps {
  params: Params;
}

export default function PlacesPage({ params }: PlacesPageProps) {
  const { locale } = use(params);
  const t = useTranslations('places');
  const [searchQuery, setSearchQuery] = useState('');
  const { places, loading, error } = usePlaces({ query: searchQuery });

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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {t('title')}
      </h1>

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

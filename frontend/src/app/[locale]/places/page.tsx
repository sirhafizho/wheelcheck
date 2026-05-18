'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api';
import type { Place } from '@/lib/types';
import { PlaceCard } from '@/components/places/PlaceCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE = 20;

type Params = Promise<{ locale: string }>;

interface PlacesPageProps {
  params: Params;
}

export default function PlacesPage({ params }: PlacesPageProps) {
  const { locale } = use(params);
  const t = useTranslations('places');
  const tAddPlace = useTranslations('addPlace');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  const loadPlaces = useCallback(async ({
    nextPage,
    append,
    query,
  }: {
    nextPage: number;
    append: boolean;
    query: string;
  }) => {
    const requestId = ++requestIdRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await api.searchPlaces(
        query
          ? { query }
          : { page: nextPage, size: PAGE_SIZE }
      );

      if (requestId !== requestIdRef.current) {
        return false;
      }

      setPlaces((currentPlaces) => (
        append ? [...currentPlaces, ...response.data] : response.data
      ));
      setTotal(response.total);
      return true;
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : tCommon('error'));
        if (!append) {
          setPlaces([]);
          setTotal(0);
        }
      }
      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    }
  }, [tCommon]);

  useEffect(() => {
    setPage(0);
    setPlaces([]);
    setTotal(0);
    void loadPlaces({ nextPage: 0, append: false, query: debouncedSearch });
  }, [debouncedSearch, loadPlaces]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const didLoad = await loadPlaces({ nextPage, append: true, query: debouncedSearch });

    if (didLoad) {
      setPage(nextPage);
    }
  };

  const hasMore = debouncedSearch.length === 0 && places.length < total;

  if (loading && places.length === 0) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header skeleton — matches h1 text-3xl + subtitle */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="h-9 w-40 rounded-lg bg-gray-200 animate-pulse mb-2" />
              <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
          {/* SearchInput skeleton */}
          <div className="mb-6 h-12 w-full rounded-lg bg-gray-200 animate-pulse" />
          {/* Card grid — matches grid gap-4 md:grid-cols-2 lg:grid-cols-3 + PlaceCard */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-white shadow-md overflow-hidden">
                <div className="p-4">
                  {/* Row 1: title + access badge */}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="h-6 flex-1 rounded bg-gray-200 animate-pulse" />
                    <div className="h-6 w-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
                  </div>
                  {/* Row 2: pin icon + address */}
                  <div className="mb-3 flex items-start gap-2">
                    <div className="mt-0.5 h-4 w-4 rounded bg-gray-200 animate-pulse shrink-0" />
                    <div className="h-4 flex-1 rounded bg-gray-200 animate-pulse" />
                  </div>
                  {/* Row 3: city/state */}
                  <div className="mb-3 h-4 w-32 rounded bg-gray-200 animate-pulse" />
                  {/* Row 4: review count */}
                  <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && places.length === 0) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-16">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('showing', { count: places.length })}</p>
          </div>
          {/* Desktop: show inline; hidden on mobile (FAB used instead) */}
          <Link
            href={`/${locale}/add-place`}
            className="hidden sm:inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[48px]"
          >
            <PlusIcon className="w-5 h-5" aria-hidden="true" />
            <span>{tAddPlace('title')}</span>
          </Link>
        </div>

        <div className="mb-6">
          <SearchInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && places.length > 0 && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {places.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('noResults')}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => (
                <PlaceCard key={place.id} place={place} locale={locale} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                  className="min-w-[160px]"
                >
                  {loadingMore ? t('loadingMore') : t('loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {/* Mobile FAB — only shown on small screens */}
      <Link
        href={`/${locale}/add-place`}
        aria-label={tAddPlace('title')}
        data-testid="add-place-fab"
        className="sm:hidden fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        <PlusIcon className="h-7 w-7" aria-hidden="true" />
      </Link>
    </div>
  );
}

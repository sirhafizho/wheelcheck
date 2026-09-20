'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';
import { useRecentPlaces } from '@/hooks/useRecentPlaces';
import { api } from '@/lib/api';
import type { Place } from '@/lib/types';
import { PlaceCard } from '@/components/places/PlaceCard';
import { PlacesSidebar } from '@/components/places/PlacesSidebar';
import { RecentStrip } from '@/components/places/RecentStrip';
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
  const { recent } = useRecentPlaces();

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
  const isInitialLoad = loading && places.length === 0 && !debouncedSearch;

  return (
    <div className="h-full overflow-y-auto pb-16">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isInitialLoad ? (
              <>
                <div className="h-9 w-40 rounded-lg bg-gray-200 animate-pulse mb-2" />
                <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {t('showing', { count: places.length })}
                  {total > places.length && ` of ${total.toLocaleString()}`}
                </p>
              </>
            )}
          </div>
          <Link
            href={`/${locale}/add-place`}
            className="hidden sm:inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 min-h-[44px]"
          >
            <PlusIcon className="w-5 h-5" aria-hidden="true" />
            <span>{tAddPlace('title')}</span>
          </Link>
        </div>

        {/* Desktop: sidebar + content | Mobile/Tablet: stacked */}
        <div className="flex gap-8">
          {/* Sidebar — hidden below xl (1280px) */}
          <div className="hidden xl:block w-56 flex-shrink-0">
            <div className="sticky top-6">
              <PlacesSidebar locale={locale} recent={recent} />
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="mb-5">
              <SearchInput
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Recent strip — visible below xl (when sidebar is hidden) */}
            <div className="xl:hidden">
              <RecentStrip recent={recent} locale={locale} />
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Cards */}
            {loading && places.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="h-6 w-24 rounded-full bg-gray-100 animate-pulse" />
                        <div className="h-6 w-8 rounded-full bg-gray-100 animate-pulse" />
                      </div>
                      <div className="h-5 w-3/4 rounded bg-gray-100 animate-pulse mb-2" />
                      <div className="flex items-start gap-1.5 mb-2">
                        <div className="mt-0.5 h-3.5 w-3.5 rounded bg-gray-100 animate-pulse" />
                        <div className="h-4 flex-1 rounded bg-gray-100 animate-pulse" />
                      </div>
                      <div className="pt-2 border-t border-gray-50">
                        <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">{'\uD83D\uDD0D'}</div>
                <p className="text-gray-500 font-medium">{t('noResults')}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      className="min-w-[160px] rounded-xl"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          {t('loadingMore')}
                        </span>
                      ) : t('loadMore')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <Link
        href={`/${locale}/add-place`}
        aria-label={tAddPlace('title')}
        data-testid="add-place-fab"
        className="sm:hidden fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        <PlusIcon className="h-7 w-7" aria-hidden="true" />
      </Link>
    </div>
  );
}

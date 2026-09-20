'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlusIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

interface FilterOption {
  name: string;
  count: number;
}

interface Filters {
  cities: FilterOption[];
  categories: FilterOption[];
  states: FilterOption[];
}

type Params = Promise<{ locale: string }>;

interface PlacesPageProps {
  params: Params;
}

export default function PlacesPage({ params }: PlacesPageProps) {
  const { locale } = use(params);
  const t = useTranslations('places');
  const tAddPlace = useTranslations('addPlace');
  const tCat = useTranslations('addPlace.categories');
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

  // Filter state
  const [filters, setFilters] = useState<Filters | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccess, setSelectedAccess] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [selectedCity, selectedCategory, selectedAccess].filter(Boolean).length;

  // Load available filters on mount
  useEffect(() => {
    api.getFilters().then(setFilters).catch(() => {});
  }, []);

  const loadPlaces = useCallback(async ({
    nextPage,
    append,
    query,
    city,
    category,
    accessLevel,
  }: {
    nextPage: number;
    append: boolean;
    query: string;
    city?: string;
    category?: string;
    accessLevel?: string;
  }) => {
    const requestId = ++requestIdRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const hasFilters = !!(city || category || accessLevel);
      const response = await api.searchPlaces(
        query && !hasFilters
          ? { query }
          : { page: nextPage, size: PAGE_SIZE, query: query || undefined, city, category, accessLevel }
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
    void loadPlaces({
      nextPage: 0,
      append: false,
      query: debouncedSearch,
      city: selectedCity || undefined,
      category: selectedCategory || undefined,
      accessLevel: selectedAccess || undefined,
    });
  }, [debouncedSearch, selectedCity, selectedCategory, selectedAccess, loadPlaces]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const didLoad = await loadPlaces({
      nextPage,
      append: true,
      query: debouncedSearch,
      city: selectedCity || undefined,
      category: selectedCategory || undefined,
      accessLevel: selectedAccess || undefined,
    });

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
            {/* Search + filter toggle */}
            <div className="mb-4 flex gap-2">
              <div className="flex-1">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium
                  transition-colors min-h-[48px] flex-shrink-0
                  ${activeFilterCount > 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}
                `}
                aria-label="Toggle filters"
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-600 text-white text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter dropdowns */}
            {showFilters && (
              <div className="mb-5 rounded-xl bg-white ring-1 ring-black/5 p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* City filter */}
                  <div>
                    <label htmlFor="filter-city" className="block text-xs font-medium text-gray-500 mb-1">
                      City
                    </label>
                    <select
                      id="filter-city"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                    >
                      <option value="">All cities</option>
                      {filters?.cities.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.count.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category filter */}
                  <div>
                    <label htmlFor="filter-category" className="block text-xs font-medium text-gray-500 mb-1">
                      {t('category')}
                    </label>
                    <select
                      id="filter-category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                    >
                      <option value="">All categories</option>
                      {filters?.categories.map((c) => (
                        <option key={c.name} value={c.name}>
                          {(() => { try { return (tCat as (key: string) => string)(c.name); } catch { return c.name; } })()}
                          {' '}({c.count.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Accessibility filter */}
                  <div>
                    <label htmlFor="filter-access" className="block text-xs font-medium text-gray-500 mb-1">
                      {t('accessibility')}
                    </label>
                    <select
                      id="filter-access"
                      value={selectedAccess}
                      onChange={(e) => setSelectedAccess(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                    >
                      <option value="">All levels</option>
                      <option value="FULL">{'\u2705'} Accessible</option>
                      <option value="PARTIAL">{'\u26A0\uFE0F'} Partially</option>
                      <option value="NOT_ACCESSIBLE">{'\u274C'} Not Accessible</option>
                      <option value="UNKNOWN">{'\u2753'} Unknown</option>
                    </select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity('');
                      setSelectedCategory('');
                      setSelectedAccess('');
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Active filter pills (shown when filters panel is closed) */}
            {!showFilters && activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCity && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {selectedCity}
                    <button type="button" onClick={() => setSelectedCity('')} className="hover:text-red-500">
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {(() => { try { return (tCat as (key: string) => string)(selectedCategory); } catch { return selectedCategory; } })()}
                    <button type="button" onClick={() => setSelectedCategory('')} className="hover:text-red-500">
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {selectedAccess && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    {selectedAccess}
                    <button type="button" onClick={() => setSelectedAccess('')} className="hover:text-red-500">
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            )}

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

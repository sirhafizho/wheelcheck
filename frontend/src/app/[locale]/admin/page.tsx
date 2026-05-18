'use client';

import { Fragment, use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { API_URL } from '@/lib/constants';

type Params = Promise<{ locale: string }>;
type TabKey = 'places' | 'reviews' | 'users' | 'enrichment';
type AccessLevel = 'FULL' | 'PARTIAL' | 'NOT_ACCESSIBLE' | 'UNKNOWN';
type Category =
  | 'RESTAURANT'
  | 'MALL'
  | 'HOSPITAL'
  | 'MOSQUE'
  | 'GOVERNMENT'
  | 'TRANSPORT'
  | 'HOTEL'
  | 'PARK'
  | 'EDUCATION'
  | 'OTHER';

interface AdminStats {
  totalPlaces: number;
  totalReviews: number;
  totalUsers: number;
  recentReviews: ReviewDto[];
}

interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

interface PlaceDto {
  id: string;
  name: string;
  nameMs?: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string;
  category: Category;
  accessibilityLevel: AccessLevel;
  reviewCount: number;
  createdAt: string;
}

interface ReviewDto {
  id: string;
  placeId: string;
  userId?: string | null;
  entrance: AccessLevel;
  toilet: AccessLevel;
  parking: AccessLevel;
  internalNav: AccessLevel;
  notes?: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  role: 'ADMIN' | 'USER';
  createdAt: string;
  updatedAt: string;
}

interface EditablePlaceForm {
  name: string;
  nameMs: string;
  address: string;
  city: string;
  category: Category;
}

interface EnrichmentStateStats {
  state: string; total: number; enriched: number; unenriched: number;
  verifiedCount: number; inferredCount: number; assumptionCount: number;
}

interface EnrichmentBatchProgress { running: boolean; processed: number; total: number; currentState: string; }

const TOKEN_KEY = 'wheelcheck_token';
const PAGE_SIZE = 20;
const CATEGORIES: Category[] = [
  'RESTAURANT',
  'MALL',
  'HOSPITAL',
  'MOSQUE',
  'GOVERNMENT',
  'TRANSPORT',
  'HOTEL',
  'PARK',
  'EDUCATION',
  'OTHER',
];
const ACCESS_LEVEL_EMOJIS: Record<AccessLevel, string> = {
  FULL: '✅',
  PARTIAL: '⚠️',
  NOT_ACCESSIBLE: '❌',
  UNKNOWN: '❓',
};

class AccessDeniedError extends Error {
  constructor() {
    super('Access denied');
    this.name = 'AccessDeniedError';
  }
}

function parseErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  for (const key of ['message', 'error']) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

async function adminRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    throw new AccessDeniedError();
  }

  if (!response.ok) {
    const rawText = await response.text();
    let payload: unknown = null;

    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = null;
      }
    }

    throw new Error(parseErrorMessage(payload) || rawText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function truncateText(value: string | null | undefined, maxLength: number): string {
  if (!value) {
    return '—';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function getAccessEmoji(level: AccessLevel): string {
  return ACCESS_LEVEL_EMOJIS[level] || ACCESS_LEVEL_EMOJIS.UNKNOWN;
}

function formatAccessLabel(level: AccessLevel): string {
  return `${getAccessEmoji(level)} ${level.replaceAll('_', ' ')}`;
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-emerald-600">{value}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
      {message}
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  isFirst,
  isLast,
  previousLabel,
  nextLabel,
  pageLabel,
  ofLabel,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
  ofLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-600">
        {pageLabel} {Math.min(page + 1, Math.max(totalPages, 1))} {ofLabel} {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onPrevious} disabled={isFirst} aria-label={previousLabel}>
          {previousLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onNext} disabled={isLast || totalPages === 0} aria-label={nextLabel}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage({ params }: { params: Params }) {
  const { locale } = use(params);
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tAddPlace = useTranslations('addPlace');
  const tCategories = useTranslations('addPlace.categories');
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('places');
  const [placesPage, setPlacesPage] = useState<SpringPage<PlaceDto> | null>(null);
  const [reviewsPage, setReviewsPage] = useState<SpringPage<ReviewDto> | null>(null);
  const [usersPage, setUsersPage] = useState<SpringPage<AdminUserDto> | null>(null);
  const [tabLoading, setTabLoading] = useState<Record<TabKey, boolean>>({
    places: false,
    reviews: false,
    users: false,
    enrichment: false,
  });
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [placeForm, setPlaceForm] = useState<EditablePlaceForm | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterAccess, setFilterAccess] = useState('');
  const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  // ── Enrichment state ────────────────────────────────────────────────────────
  const [enrichmentStats, setEnrichmentStats] = useState<EnrichmentStateStats[] | null>(null);
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentBatchProgress | null>(null);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);
  const enrichmentPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    [locale]
  );

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        if (isMounted) {
          setAccessDenied(true);
          setLoading(false);
        }
        return;
      }

      setToken(storedToken);

      try {
        const statsData = await adminRequest<AdminStats>(storedToken, '/admin/stats');
        const initialPlaces = await adminRequest<SpringPage<PlaceDto>>(storedToken, `/admin/places?page=0&size=${PAGE_SIZE}`);

        if (!isMounted) {
          return;
        }

        setStats(statsData);
        setPlacesPage(initialPlaces);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        if (requestError instanceof AccessDeniedError) {
          setAccessDenied(true);
        } else {
          setError(getErrorMessage(requestError, tCommon('error')));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [tCommon]);

  const handleAccessDenied = () => {
    setAccessDenied(true);
    setError(null);
    setEditingPlaceId(null);
    setPlaceForm(null);
  };

  const refreshStats = async (authToken = token) => {
    if (!authToken) {
      handleAccessDenied();
      return;
    }

    const data = await adminRequest<AdminStats>(authToken, '/admin/stats');
    setStats(data);
  };

  const loadPlaces = async (page: number, authToken = token, filters?: { query?: string; category?: string; city?: string; accessLevel?: string }) => {
    if (!authToken) {
      handleAccessDenied();
      return;
    }

    setTabLoading((prev) => ({ ...prev, places: true }));
    setError(null);

    try {
      const q = filters?.query ?? searchQuery;
      const cat = filters?.category ?? filterCategory;
      const city = filters?.city ?? filterCity;
      const access = filters?.accessLevel ?? filterAccess;

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('size', String(PAGE_SIZE));
      if (q) params.set('search', q);
      if (cat) params.set('category', cat);
      if (city) params.set('city', city);
      if (access) params.set('accessLevel', access);

      const data = await adminRequest<SpringPage<PlaceDto>>(authToken, `/admin/places?${params.toString()}`);
      setPlacesPage(data);
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setTabLoading((prev) => ({ ...prev, places: false }));
    }
  };

  const loadReviews = async (page: number, authToken = token) => {
    if (!authToken) {
      handleAccessDenied();
      return;
    }

    setTabLoading((prev) => ({ ...prev, reviews: true }));
    setError(null);

    try {
      const data = await adminRequest<SpringPage<ReviewDto>>(authToken, `/admin/reviews?page=${page}&size=${PAGE_SIZE}`);
      setReviewsPage(data);
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setTabLoading((prev) => ({ ...prev, reviews: false }));
    }
  };

  const loadUsers = async (page: number, authToken = token) => {
    if (!authToken) {
      handleAccessDenied();
      return;
    }

    setTabLoading((prev) => ({ ...prev, users: true }));
    setError(null);

    try {
      const data = await adminRequest<SpringPage<AdminUserDto>>(authToken, `/admin/users?page=${page}&size=${PAGE_SIZE}`);
      setUsersPage(data);
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setTabLoading((prev) => ({ ...prev, users: false }));
    }
  };

  const handleTabChange = async (nextTab: TabKey) => {
    setActiveTab(nextTab);

    if (nextTab !== 'places') {
      setEditingPlaceId(null);
      setPlaceForm(null);
    }

    if (nextTab === 'reviews' && !reviewsPage) {
      await loadReviews(0);
    }

    if (nextTab === 'users' && !usersPage) {
      await loadUsers(0);
    }

    if (nextTab === 'places' && !placesPage) {
      await loadPlaces(0);
    }

    if (nextTab === 'enrichment' && !enrichmentStats) {
      await loadEnrichmentStats();
    }
  };

  const startEditingPlace = (place: PlaceDto) => {
    setEditingPlaceId(place.id);
    setPlaceForm({
      name: place.name,
      nameMs: place.nameMs ?? '',
      address: place.address ?? '',
      city: place.city,
      category: place.category,
    });
  };

  const cancelEditingPlace = () => {
    setEditingPlaceId(null);
    setPlaceForm(null);
  };

  const handleSavePlace = async (place: PlaceDto) => {
    if (!token || !placeForm) {
      handleAccessDenied();
      return;
    }

    setActionKey(`save-place-${place.id}`);
    setError(null);

    try {
      const updated = await adminRequest<PlaceDto>(token, `/admin/places/${place.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: placeForm.name.trim(),
          nameMs: placeForm.nameMs.trim() || null,
          latitude: place.latitude,
          longitude: place.longitude,
          address: placeForm.address.trim(),
          city: placeForm.city.trim(),
          category: placeForm.category,
          accessibilityLevel: place.accessibilityLevel,
        }),
      });

      setPlacesPage((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((item) => (item.id === updated.id ? updated : item)),
            }
          : prev
      );
      cancelEditingPlace();
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setActionKey(null);
    }
  };

  const handleDeletePlace = async (place: PlaceDto) => {
    if (!token || !window.confirm(t('actions.confirmDelete'))) {
      return;
    }

    setActionKey(`delete-place-${place.id}`);
    setError(null);

    try {
      await adminRequest<void>(token, `/admin/places/${place.id}`, { method: 'DELETE' });
      await refreshStats();
      const nextPage = placesPage && placesPage.content.length === 1 && placesPage.number > 0 ? placesPage.number - 1 : placesPage?.number ?? 0;
      await loadPlaces(nextPage);
      if (editingPlaceId === place.id) {
        cancelEditingPlace();
      }
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setActionKey(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!token || !window.confirm(t('actions.confirmDelete'))) {
      return;
    }

    setActionKey(`delete-review-${reviewId}`);
    setError(null);

    try {
      await adminRequest<void>(token, `/admin/reviews/${reviewId}`, { method: 'DELETE' });
      await refreshStats();
      const nextPage = reviewsPage && reviewsPage.content.length === 1 && reviewsPage.number > 0 ? reviewsPage.number - 1 : reviewsPage?.number ?? 0;
      await loadReviews(nextPage);
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setActionKey(null);
    }
  };

  const handleToggleUserRole = async (user: AdminUserDto) => {
    if (!token) {
      handleAccessDenied();
      return;
    }

    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setActionKey(`toggle-user-${user.id}`);
    setError(null);

    try {
      const updated = await adminRequest<AdminUserDto>(token, `/admin/users/${user.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: nextRole }),
      });

      setUsersPage((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((item) => (item.id === updated.id ? updated : item)),
            }
          : prev
      );
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setActionKey(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!token || !window.confirm(t('actions.confirmDelete'))) {
      return;
    }

    setActionKey(`delete-user-${userId}`);
    setError(null);

    try {
      await adminRequest<void>(token, `/admin/users/${userId}`, { method: 'DELETE' });
      await refreshStats();
      const nextPage = usersPage && usersPage.content.length === 1 && usersPage.number > 0 ? usersPage.number - 1 : usersPage?.number ?? 0;
      await loadUsers(nextPage);
    } catch (requestError) {
      if (requestError instanceof AccessDeniedError) {
        handleAccessDenied();
      } else {
        setError(getErrorMessage(requestError, tCommon('error')));
      }
    } finally {
      setActionKey(null);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounce) clearTimeout(searchDebounce);
    setSearchDebounce(
      setTimeout(() => {
        void loadPlaces(0, token, { query: value, category: filterCategory, city: filterCity, accessLevel: filterAccess });
      }, 400)
    );
  };

  const handleFilterChange = (key: 'category' | 'city' | 'accessLevel', value: string) => {
    const filters = { query: searchQuery, category: filterCategory, city: filterCity, accessLevel: filterAccess };
    filters[key] = value;
    if (key === 'category') setFilterCategory(value);
    if (key === 'city') setFilterCity(value);
    if (key === 'accessLevel') setFilterAccess(value);
    void loadPlaces(0, token, filters);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterCity('');
    setFilterAccess('');
    void loadPlaces(0, token, { query: '', category: '', city: '', accessLevel: '' });
  };

  const hasActiveFilters = searchQuery || filterCategory || filterCity || filterAccess;

  const renderPlacesTable = () => {
    if (tabLoading.places && !placesPage) {
      return (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-white shadow-sm">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (!placesPage) {
      return null;
    }

    const isSaveDisabled =
      !placeForm?.name.trim() || !placeForm.address.trim() || !placeForm.city.trim() || !placeForm.category;

    return (
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name or address..."
                className="min-h-[44px] w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                data-testid="admin-search-input"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="admin-filter-category"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{tCategories(cat)}</option>
              ))}
            </select>
            <select
              value={filterAccess}
              onChange={(e) => handleFilterChange('accessLevel', e.target.value)}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              data-testid="admin-filter-access"
            >
              <option value="">All Access Levels</option>
              <option value="FULL">{formatAccessLabel('FULL')}</option>
              <option value="PARTIAL">{formatAccessLabel('PARTIAL')}</option>
              <option value="NOT_ACCESSIBLE">{formatAccessLabel('NOT_ACCESSIBLE')}</option>
              <option value="UNKNOWN">{formatAccessLabel('UNKNOWN')}</option>
            </select>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="min-h-[44px]"
                data-testid="admin-clear-filters"
              >
                Clear
              </Button>
            )}
          </div>
          {hasActiveFilters && placesPage && (
            <p className="mt-2 text-sm text-gray-500" data-testid="admin-filter-count">
              {placesPage.totalElements} results
            </p>
          )}
        </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] divide-y divide-gray-200">
            <thead className="bg-emerald-50 text-left text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('table.name')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.address')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.city')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.category')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.accessibility')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.reviews')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {placesPage.content.map((place) => {
                const isEditing = editingPlaceId === place.id && Boolean(placeForm);
                const rowActionLoading = actionKey === `delete-place-${place.id}` || actionKey === `save-place-${place.id}`;

                return (
                  <Fragment key={place.id}>
                    <tr className="align-top">
                      <td className="px-4 py-4 font-medium text-gray-900">{place.name}</td>
                      <td className="px-4 py-4">{place.address}</td>
                      <td className="px-4 py-4">{place.city}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{tCategories(place.category)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">{formatAccessLabel(place.accessibilityLevel)}</td>
                      <td className="px-4 py-4">{place.reviewCount}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => startEditingPlace(place)}
                            disabled={rowActionLoading}
                            aria-label={`${t('actions.edit')} ${place.name}`}
                          >
                            {t('actions.edit')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handleDeletePlace(place)}
                            disabled={rowActionLoading}
                            aria-label={`${t('actions.delete')} ${place.name}`}
                          >
                            {actionKey === `delete-place-${place.id}` ? <LoadingSpinner size="sm" /> : t('actions.delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && placeForm && (
                      <tr className="bg-emerald-50/50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label htmlFor={`place-name-${place.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                                {t('table.name')}
                              </label>
                              <input
                                id={`place-name-${place.id}`}
                                type="text"
                                value={placeForm.name}
                                onChange={(event) =>
                                  setPlaceForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                                }
                                className="min-h-[48px] w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label htmlFor={`place-name-ms-${place.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                                {tAddPlace('nameMs')}
                              </label>
                              <input
                                id={`place-name-ms-${place.id}`}
                                type="text"
                                value={placeForm.nameMs}
                                onChange={(event) =>
                                  setPlaceForm((prev) => (prev ? { ...prev, nameMs: event.target.value } : prev))
                                }
                                className="min-h-[48px] w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label htmlFor={`place-address-${place.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                                {t('table.address')}
                              </label>
                              <input
                                id={`place-address-${place.id}`}
                                type="text"
                                value={placeForm.address}
                                onChange={(event) =>
                                  setPlaceForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))
                                }
                                className="min-h-[48px] w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label htmlFor={`place-city-${place.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                                {t('table.city')}
                              </label>
                              <input
                                id={`place-city-${place.id}`}
                                type="text"
                                value={placeForm.city}
                                onChange={(event) =>
                                  setPlaceForm((prev) => (prev ? { ...prev, city: event.target.value } : prev))
                                }
                                className="min-h-[48px] w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label htmlFor={`place-category-${place.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                                {t('table.category')}
                              </label>
                              <select
                                id={`place-category-${place.id}`}
                                value={placeForm.category}
                                onChange={(event) =>
                                  setPlaceForm((prev) =>
                                    prev ? { ...prev, category: event.target.value as Category } : prev
                                  )
                                }
                                className="min-h-[48px] w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {CATEGORIES.map((category) => (
                                  <option key={category} value={category}>
                                    {tCategories(category)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button
                              type="button"
                              onClick={() => void handleSavePlace(place)}
                              disabled={Boolean(isSaveDisabled || rowActionLoading)}
                              aria-label={`${t('actions.save')} ${place.name}`}
                            >
                              {actionKey === `save-place-${place.id}` ? <LoadingSpinner size="sm" /> : t('actions.save')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelEditingPlace}
                              disabled={rowActionLoading}
                              aria-label={t('actions.cancel')}
                            >
                              {t('actions.cancel')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={placesPage.number}
          totalPages={placesPage.totalPages}
          isFirst={placesPage.first || tabLoading.places}
          isLast={placesPage.last || tabLoading.places}
          previousLabel={t('pagination.previous')}
          nextLabel={t('pagination.next')}
          pageLabel={t('pagination.page')}
          ofLabel={t('pagination.of')}
          onPrevious={() => {
            cancelEditingPlace();
            void loadPlaces(placesPage.number - 1);
          }}
          onNext={() => {
            cancelEditingPlace();
            void loadPlaces(placesPage.number + 1);
          }}
        />
      </div>
      </div>
    );
  };

  const renderReviewsTable = () => {
    if (tabLoading.reviews && !reviewsPage) {
      return (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-white shadow-sm">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (!reviewsPage) {
      return null;
    }

    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] divide-y divide-gray-200">
            <thead className="bg-emerald-50 text-left text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('table.placeId')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.entrance')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.toilet')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.parking')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.internalNav')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.notes')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.date')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {reviewsPage.content.map((review) => (
                <tr key={review.id} className="align-top">
                  <td className="px-4 py-4 font-medium text-gray-900">{review.placeId.slice(0, 8)}</td>
                  <td className="px-4 py-4 text-xl">{getAccessEmoji(review.entrance)}</td>
                  <td className="px-4 py-4 text-xl">{getAccessEmoji(review.toilet)}</td>
                  <td className="px-4 py-4 text-xl">{getAccessEmoji(review.parking)}</td>
                  <td className="px-4 py-4 text-xl">{getAccessEmoji(review.internalNav)}</td>
                  <td className="px-4 py-4 max-w-xs">{truncateText(review.notes, 72)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">{dateFormatter.format(new Date(review.createdAt))}</td>
                  <td className="px-4 py-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleDeleteReview(review.id)}
                      disabled={actionKey === `delete-review-${review.id}`}
                      aria-label={`${t('actions.delete')} ${review.id.slice(0, 8)}`}
                    >
                      {actionKey === `delete-review-${review.id}` ? <LoadingSpinner size="sm" /> : t('actions.delete')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={reviewsPage.number}
          totalPages={reviewsPage.totalPages}
          isFirst={reviewsPage.first || tabLoading.reviews}
          isLast={reviewsPage.last || tabLoading.reviews}
          previousLabel={t('pagination.previous')}
          nextLabel={t('pagination.next')}
          pageLabel={t('pagination.page')}
          ofLabel={t('pagination.of')}
          onPrevious={() => void loadReviews(reviewsPage.number - 1)}
          onNext={() => void loadReviews(reviewsPage.number + 1)}
        />
      </div>
    );
  };

  const renderUsersTable = () => {
    if (tabLoading.users && !usersPage) {
      return (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-white shadow-sm">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (!usersPage) {
      return null;
    }

    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] divide-y divide-gray-200">
            <thead className="bg-emerald-50 text-left text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('table.name')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.email')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.role')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.verified')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.joined')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {usersPage.content.map((user) => {
                const toggleLabel = user.role === 'ADMIN' ? t('actions.makeUser') : t('actions.makeAdmin');
                const isToggleLoading = actionKey === `toggle-user-${user.id}`;
                const isDeleteLoading = actionKey === `delete-user-${user.id}`;

                return (
                  <tr key={user.id} className="align-top">
                    <td className="px-4 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-4 break-all">{user.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{user.role}</td>
                    <td className="px-4 py-4 text-xl">{user.isVerified ? '✅' : '—'}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{dateFormatter.format(new Date(user.createdAt))}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleToggleUserRole(user)}
                          disabled={isToggleLoading || isDeleteLoading}
                          aria-label={`${toggleLabel} ${user.email}`}
                        >
                          {isToggleLoading ? <LoadingSpinner size="sm" /> : toggleLabel}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleDeleteUser(user.id)}
                          disabled={isDeleteLoading || isToggleLoading}
                          aria-label={`${t('actions.delete')} ${user.email}`}
                        >
                          {isDeleteLoading ? <LoadingSpinner size="sm" /> : t('actions.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={usersPage.number}
          totalPages={usersPage.totalPages}
          isFirst={usersPage.first || tabLoading.users}
          isLast={usersPage.last || tabLoading.users}
          previousLabel={t('pagination.previous')}
          nextLabel={t('pagination.next')}
          pageLabel={t('pagination.page')}
          ofLabel={t('pagination.of')}
          onPrevious={() => void loadUsers(usersPage.number - 1)}
          onNext={() => void loadUsers(usersPage.number + 1)}
        />
      </div>
    );
  };

  // ── Enrichment helpers ──────────────────────────────────────────────────────
  const loadEnrichmentStats = async (authToken = token) => {
    if (!authToken) return;
    setTabLoading(prev => ({ ...prev, enrichment: true }));
    setEnrichmentError(null);
    try {
      const data = await adminRequest<EnrichmentStateStats[]>(authToken, '/admin/enrich/stats');
      setEnrichmentStats(data);
      const prog = await adminRequest<EnrichmentBatchProgress>(authToken, '/admin/enrich/progress');
      setEnrichmentProgress(prog);
    } catch (e) {
      setEnrichmentError(getErrorMessage(e, 'Failed to load enrichment stats'));
    } finally {
      setTabLoading(prev => ({ ...prev, enrichment: false }));
    }
  };

  const startEnrichment = async (state: string) => {
    if (!token) return;
    setEnrichmentError(null);
    try {
      await adminRequest(token, `/admin/enrich/state/${encodeURIComponent(state)}`, { method: 'POST' });
      if (enrichmentPollRef.current) clearInterval(enrichmentPollRef.current);
      enrichmentPollRef.current = setInterval(async () => {
        if (!token) return;
        try {
          const prog = await adminRequest<EnrichmentBatchProgress>(token, '/admin/enrich/progress');
          setEnrichmentProgress(prog);
          if (!prog.running) {
            clearInterval(enrichmentPollRef.current!);
            enrichmentPollRef.current = null;
            await loadEnrichmentStats(token);
          }
        } catch { /* ignore poll errors */ }
      }, 5000);
      const prog = await adminRequest<EnrichmentBatchProgress>(token, '/admin/enrich/progress');
      setEnrichmentProgress(prog);
    } catch (e) {
      setEnrichmentError(getErrorMessage(e, `Failed to start enrichment for ${state}`));
    }
  };

  const MALAYSIAN_STATES = [
    'Johor','Kedah','Kelantan','Melaka','Negeri Sembilan',
    'Pahang','Perak','Perlis','Pulau Pinang','Sabah',
    'Sarawak','Selangor','Terengganu','Kuala Lumpur','Labuan','Putrajaya',
  ];

  const renderEnrichmentTab = () => {
    if (tabLoading.enrichment && !enrichmentStats) {
      return (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-white shadow-sm">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const progress = enrichmentProgress;
    const statsMap = new Map(enrichmentStats?.map(s => [s.state.toLowerCase(), s]));

    return (
      <div className="space-y-6">
        {enrichmentError && <ErrorBanner message={enrichmentError} />}

        {/* Progress banner */}
        {progress?.running && (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-sm font-semibold text-emerald-800">
                ✨ Enriching <strong>{progress.currentState}</strong>…
              </span>
              <span className="text-sm text-emerald-700">
                {progress.processed} / {progress.total}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-emerald-200">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: progress.total > 0 ? `${Math.round((progress.processed / progress.total) * 100)}%` : '0%' }}
              />
            </div>
            <p className="mt-1 text-xs text-emerald-600">Rate-limited to ~8 calls/min (Gemini free tier)</p>
          </div>
        )}

        {/* State table */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] divide-y divide-gray-200 text-sm">
              <thead className="bg-emerald-50 text-left text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">State</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-right">Enriched</th>
                  <th className="px-4 py-3 font-semibold text-right">🟢 Verified</th>
                  <th className="px-4 py-3 font-semibold text-right">🟡 Inferred</th>
                  <th className="px-4 py-3 font-semibold text-right">⚪ Assumption</th>
                  <th className="px-4 py-3 font-semibold text-right">Pending</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MALAYSIAN_STATES.map(state => {
                  const s = statsMap.get(state.toLowerCase());
                  const isRunning = progress?.running && progress.currentState.toLowerCase() === state.toLowerCase();
                  const pct = s && s.total > 0 ? Math.round((s.enriched / s.total) * 100) : 0;
                  return (
                    <tr key={state} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{state}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{s?.total ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-emerald-600">{s?.enriched ?? '—'}</span>
                        {s && s.total > 0 && (
                          <span className="ml-1 text-xs text-gray-400">({pct}%)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">{s?.verifiedCount ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-yellow-600">{s?.inferredCount ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{s?.assumptionCount ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-red-500">{s ? s.unenriched : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          onClick={() => void startEnrichment(state)}
                          disabled={isRunning || progress?.running}
                          className="min-h-[36px] px-3 py-1.5 text-xs"
                        >
                          {isRunning ? <LoadingSpinner size="sm" /> : (s?.unenriched === 0 ? 'Re-enrich' : 'Enrich')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-4 py-3 text-right">
            <Button variant="ghost" onClick={() => void loadEnrichmentStats()} className="text-sm">
              ↻ Refresh
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Powered by Gemini 1.5 Flash with Google Search Grounding · Free tier: 1,500 req/day, 15 req/min · Batch rate: ~8/min
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center pb-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="h-full overflow-y-auto pb-16">
      <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-8">
        <div className="w-full rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">{t('accessDenied')}</h1>
          <p className="mt-3 text-gray-600">{t('accessDeniedMessage')}</p>
          <Link
            href={`/${locale}`}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-16">
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title={t('stats.totalPlaces')} value={stats?.totalPlaces ?? 0} />
          <StatCard title={t('stats.totalReviews')} value={stats?.totalReviews ?? 0} />
          <StatCard title={t('stats.totalUsers')} value={stats?.totalUsers ?? 0} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-xl bg-white p-2 shadow-sm ring-1 ring-gray-100" role="tablist" aria-label={t('title')}>
        {(['places', 'reviews', 'users', 'enrichment'] as TabKey[]).map((tab) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={t(`tabs.${tab}`)}
              onClick={() => void handleTabChange(tab)}
              className={`min-h-[48px] rounded-lg px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-700 hover:bg-emerald-50'
              }`}
            >
              {t(`tabs.${tab}`)}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        {activeTab === 'places' && renderPlacesTable()}
        {activeTab === 'reviews' && renderReviewsTable()}
        {activeTab === 'users' && renderUsersTable()}
        {activeTab === 'enrichment' && renderEnrichmentTab()}
      </div>
    </div>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { API_URL } from '@/lib/constants';
import type { AccessLevel, Place } from '@/lib/types';

type Params = Promise<{ locale: string; id: string }>;

type ToastState = {
  message: string;
  type: 'success' | 'error' | 'info';
};

interface EditablePlace extends Place {
  notes?: string | null;
}

interface EditPlaceFormState {
  name: string;
  address: string;
  city: string;
  state: string;
  category: string;
  accessibilityLevel: AccessLevel;
  latitude: string;
  longitude: string;
  notes: string;
}

const EMPTY_FORM: EditPlaceFormState = {
  name: '',
  address: '',
  city: '',
  state: '',
  category: '',
  accessibilityLevel: 'UNKNOWN',
  latitude: '',
  longitude: '',
  notes: '',
};

const CATEGORIES = [
  { value: 'RESTAURANT', emoji: '🍽️' },
  { value: 'CAFE', emoji: '☕' },
  { value: 'SHOP', emoji: '🏪' },
  { value: 'MALL', emoji: '🛍️' },
  { value: 'HOSPITAL', emoji: '🏥' },
  { value: 'MOSQUE', emoji: '🕌' },
  { value: 'TRANSPORT', emoji: '🚇' },
  { value: 'GOVERNMENT', emoji: '🏛️' },
  { value: 'EDUCATION', emoji: '🎓' },
  { value: 'PARK', emoji: '🌳' },
  { value: 'HOTEL', emoji: '🏨' },
  { value: 'OTHER', emoji: '📍' },
] as const;

const ACCESSIBILITY_OPTIONS: AccessLevel[] = ['FULL', 'PARTIAL', 'NOT_ACCESSIBLE', 'UNKNOWN'];

const LocationPicker = dynamic(() => import('@/components/map/LocationPicker').then((mod) => ({ default: mod.LocationPicker })), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

export default function EditPlacePage({ params }: { params: Params }) {
  const { locale, id } = use(params);
  const router = useRouter();
  const t = useTranslations('editPlace');
  const tAddPlace = useTranslations('addPlace');
  const tCategories = useTranslations('addPlace.categories');
  const tAccess = useTranslations('access');
  const tCommon = useTranslations('common');
  const [form, setForm] = useState<EditPlaceFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const storedToken = localStorage.getItem('wheelcheck_token');
    const storedUserId = localStorage.getItem('wheelcheck_user_id');

    if (!storedToken) {
      router.replace(`/${locale}/profile`);
      return;
    }

    const loadPlace = async () => {
      try {
        const response = await fetch(`${API_URL}/places/${id}`);
        if (!response.ok) {
          throw new Error('Failed to load place');
        }

        const place = await response.json() as EditablePlace;

        if (!storedUserId || !place.createdBy || storedUserId !== place.createdBy) {
          if (!cancelled) {
            setError(t('notOwner'));
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setForm({
            name: place.name,
            address: place.address ?? '',
            city: place.city ?? '',
            state: place.state ?? '',
            category: place.category ?? '',
            accessibilityLevel: place.accessibilityLevel ?? 'UNKNOWN',
            latitude: place.latitude.toFixed(6),
            longitude: place.longitude.toFixed(6),
            notes: place.notes ?? place.description ?? '',
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(t('loadFailed'));
          setLoading(false);
        }
      }
    };

    void loadPlace();

    return () => {
      cancelled = true;
    };
  }, [id, locale, router, t]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  }, []);

  const handleAddressChange = useCallback((address: string, city?: string) => {
    setForm((prev) => ({
      ...prev,
      address: address || prev.address,
      city: city || prev.city,
    }));
  }, []);

  const canSubmit = Boolean(form.name.trim() && form.category && form.latitude && form.longitude);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const token = localStorage.getItem('wheelcheck_token');
    if (!token) {
      router.replace(`/${locale}/profile`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/places/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || null,
          city: form.city.trim() || 'Kuala Lumpur',
          state: form.state.trim() || null,
          category: form.category,
          accessibilityLevel: form.accessibilityLevel,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          notes: form.notes.trim() || null,
        }),
      });

      if (response.status === 401) {
        router.replace(`/${locale}/profile`);
        return;
      }

      if (response.status === 403) {
        setError(t('notOwner'));
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save place');
      }

      setToast({ message: t('savedSuccess'), type: 'success' });
      setTimeout(() => router.push(`/${locale}/places/${id}`), 1200);
    } catch {
      setToast({ message: t('saveFailed'), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center pb-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="mx-auto max-w-lg px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700" role="alert">
            {error}
          </div>
          <Button variant="ghost" className="mt-4" onClick={() => router.push(`/${locale}`)}>
            ← {tCommon('back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="mx-auto max-w-lg px-4 py-4">
        <Button variant="ghost" className="mb-3" onClick={() => router.push(`/${locale}/places/${id}`)}>
          ← {tCommon('back')}
        </Button>
        <h1 className="mb-1 text-xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mb-4 text-sm text-gray-500">{t('movePin')}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="edit-place-name" className="mb-1 block text-sm font-semibold text-gray-800">
              {tAddPlace('name')}
            </label>
            <input
              id="edit-place-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-place-address" className="mb-1 block text-sm font-semibold text-gray-800">
              {tAddPlace('address')}
            </label>
            <input
              id="edit-place-address"
              type="text"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder={tAddPlace('addressPlaceholder')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-place-city" className="mb-1 block text-sm font-semibold text-gray-800">
                {tAddPlace('city')}
              </label>
              <input
                id="edit-place-city"
                type="text"
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder={tAddPlace('cityPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="edit-place-state" className="mb-1 block text-sm font-semibold text-gray-800">
                {t('state')}
              </label>
              <input
                id="edit-place-state"
                type="text"
                value={form.state}
                onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              {tAddPlace('category')}
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, category: category.value }))}
                  className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                    form.category === category.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{category.emoji}</span>
                  {tCategories(category.value)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="edit-place-accessibility" className="mb-1 block text-sm font-semibold text-gray-800">
              {t('accessibilityLevel')}
            </label>
            <select
              id="edit-place-accessibility"
              value={form.accessibilityLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, accessibilityLevel: event.target.value as AccessLevel }))}
              className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ACCESSIBILITY_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {tAccess(level === 'FULL' ? 'full' : level === 'PARTIAL' ? 'partial' : level === 'NOT_ACCESSIBLE' ? 'notAccessible' : 'unknown')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800">{tAddPlace('location')}</label>
            <LocationPicker
              initialCenter={{ lat: Number(form.latitude), lng: Number(form.longitude) }}
              onLocationChange={handleLocationChange}
              onAddressChange={handleAddressChange}
            />
          </div>

          <div>
            <label htmlFor="edit-place-notes" className="mb-1 block text-sm font-semibold text-gray-800">
              {t('notes')}
            </label>
            <textarea
              id="edit-place-notes"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <Button type="submit" variant="primary" fullWidth disabled={!canSubmit || submitting} className="min-h-[52px] rounded-xl text-base font-semibold">
              {submitting ? <LoadingSpinner size="sm" /> : t('saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

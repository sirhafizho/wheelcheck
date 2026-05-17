'use client';

import dynamic from 'next/dynamic';
import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PhotoUpload } from '@/components/report/PhotoUpload';
import { API_URL } from '@/lib/constants';

type Params = Promise<{ locale: string }>;

const CATEGORIES = [
  'MALL',
  'RESTAURANT',
  'HOSPITAL',
  'MOSQUE',
  'TRANSPORT',
  'GOVERNMENT',
  'EDUCATION',
  'PARK',
  'HOTEL',
  'CAFE',
  'OTHER',
] as const;

const LocationPicker = dynamic(() => import('@/components/map/LocationPicker').then((mod) => ({ default: mod.LocationPicker })), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

interface PlaceSuggestion {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AddPlacePage({ params }: { params: Params }) {
  const { locale } = use(params);
  const router = useRouter();
  const t = useTranslations('addPlace');
  const [formData, setFormData] = useState({
    name: '',
    nameMs: '',
    address: '',
    city: 'Kuala Lumpur',
    category: '',
    latitude: '',
    longitude: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debouncedName = useDebounce(formData.name, 300);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch place name suggestions from backend search
  useEffect(() => {
    if (debouncedName.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingSuggestions(true);

    fetch(`${API_URL}/places/search?name=${encodeURIComponent(debouncedName)}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data: PlaceSuggestion[]) => {
        if (!cancelled) {
          setSuggestions(data.slice(0, 8));
          setShowSuggestions(data.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });

    return () => { cancelled = true; };
  }, [debouncedName]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = useCallback((suggestion: PlaceSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      name: suggestion.name,
      address: suggestion.address || prev.address,
      latitude: suggestion.latitude.toFixed(6),
      longitude: suggestion.longitude.toFixed(6),
      category: suggestion.category || prev.category,
    }));
    setShowSuggestions(false);
  }, []);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (latitude: number, longitude: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
  };

  const handleAddressSuggestion = (address: string) => {
    setFormData((prev) => (prev.address.trim() ? prev : { ...prev, address }));
  };

  const canSubmit = Boolean(
    formData.name &&
      formData.address &&
      formData.category &&
      formData.latitude &&
      formData.longitude
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('wheelcheck_token');
      if (!token) {
        throw new Error(t('errors.loginRequired'));
      }
      const authHeaders: HeadersInit = { Authorization: `Bearer ${token}` };

      const response = await fetch(`${API_URL}/places`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          name: formData.name,
          nameMs: formData.nameMs || undefined,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          address: formData.address,
          city: formData.city || 'Kuala Lumpur',
          category: formData.category,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(t('errors.loginRequired'));
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || t('errors.createPlace'));
      }

      const place = await response.json();

      // Upload photos if any (optional)
      for (const photo of photos) {
        try {
          const form = new FormData();
          form.append('placeId', place.id);
          form.append('file', photo);
          form.append('description', t('photoDescription'));

          await fetch(`${API_URL}/photos/upload`, {
            method: 'POST',
            headers: authHeaders,
            body: form,
          });
        } catch {
          // Photo upload is optional — don't fail the whole submission
          console.warn('Photo upload failed, continuing...');
        }
      }

      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/places/${place.id}`), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="h-full overflow-y-auto pb-16">
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('success')}</h1>
          <p className="text-gray-600">{t('successMessage')}</p>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-16">
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative" ref={suggestionsRef}>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('name')} *
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="off"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
            placeholder={t('namePlaceholder')}
          />
          {loadingSuggestions && (
            <div className="absolute right-3 top-[42px]">
              <LoadingSpinner size="sm" />
            </div>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs text-gray-500 border-b">
                {t('existingPlaces')}
              </div>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-100 last:border-0 min-h-[48px]"
                >
                  <div className="font-medium text-gray-900">{s.name}</div>
                  {s.address && <div className="text-sm text-gray-500 truncate">{s.address}</div>}
                </button>
              ))}
              <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-b-lg">
                {t('typeNewPlace')}
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="nameMs" className="block text-sm font-medium text-gray-700 mb-1">
            {t('nameMs')}
          </label>
          <input
            id="nameMs"
            type="text"
            value={formData.nameMs}
            onChange={(e) => handleChange('nameMs', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
            placeholder={t('nameMsPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            {t('address')} *
          </label>
          <input
            id="address"
            type="text"
            required
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
            placeholder={t('addressPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            {t('city')}
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            {t('category')} *
          </label>
          <select
            id="category"
            required
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px] bg-white"
          >
            <option value="">{t('selectCategory')}</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('location')} *
          </label>
          <p className="mb-2 text-sm text-gray-500">{t('locationHint')}</p>
          <LocationPicker onLocationChange={handleLocationChange} onAddressChange={handleAddressSuggestion} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('photos')} <span className="text-gray-400">({t('photosOptional')})</span>
          </label>
          <p className="text-sm text-gray-500 mb-2">{t('photosHint')}</p>
          <PhotoUpload onPhotosChange={setPhotos} maxPhotos={5} />
        </div>

        <Button type="submit" variant="primary" fullWidth disabled={!canSubmit || submitting} className="min-h-[48px]">
          {submitting ? <LoadingSpinner size="sm" /> : t('submit')}
        </Button>
      </form>
    </div>
    </div>
  );
}

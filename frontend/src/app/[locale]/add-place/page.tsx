'use client';

import dynamic from 'next/dynamic';
import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PhotoUpload } from '@/components/report/PhotoUpload';
import { createClient } from '@/lib/supabase/client';
import { API_URL } from '@/lib/constants';

type Params = Promise<{ locale: string }>;

const CATEGORIES = [
  { value: 'RESTAURANT', emoji: '🍽️' },
  { value: 'CAFE', emoji: '☕' },
  { value: 'SHOP', emoji: '🏪' },
  { value: 'MALL', emoji: '🛍️' },
  { value: 'HOSPITAL', emoji: '🏥' },
  { value: 'CLINIC', emoji: '🩺' },
  { value: 'MOSQUE', emoji: '🕌' },
  { value: 'PLACE_OF_WORSHIP', emoji: '⛪' },
  { value: 'TRANSPORT', emoji: '🚇' },
  { value: 'GOVERNMENT', emoji: '🏛️' },
  { value: 'EDUCATION', emoji: '🎓' },
  { value: 'PARK', emoji: '🌳' },
  { value: 'HOTEL', emoji: '🏨' },
  { value: 'OTHER', emoji: '📍' },
] as const;

const LocationPicker = dynamic(() => import('@/components/map/LocationPicker').then((mod) => ({ default: mod.LocationPicker })), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
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
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  // Auth check
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthToken(session?.access_token ?? null);
    });
  }, []);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debouncedName = useDebounce(name, 300);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch place name suggestions
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
          setSuggestions(data.slice(0, 6));
          setShowSuggestions(data.length > 0);
        }
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoadingSuggestions(false); });

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
    setName(suggestion.name);
    if (suggestion.address) setAddress(suggestion.address);
    setLatitude(suggestion.latitude.toFixed(6));
    setLongitude(suggestion.longitude.toFixed(6));
    if (suggestion.category) setCategory(suggestion.category);
    setShowSuggestions(false);
  }, []);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  }, []);

  const handleAddressChange = useCallback((addr: string, c?: string) => {
    if (addr && !address) setAddress(addr);
    if (c && !city) setCity(c);
  }, [address, city]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const canSubmit = Boolean(name && category && latitude && longitude);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) {
      setTouched({ name: true, category: true, location: true });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error(t('errors.loginRequired'));
      }
      const authHeaders: HeadersInit = { Authorization: `Bearer ${token}` };

      const response = await fetch(`${API_URL}/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: address || 'Malaysia',
          city: city || 'Kuala Lumpur',
          category,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(t('errors.loginRequired'));
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || t('errors.createPlace'));
      }

      const place = await response.json();

      // Upload photos if any (non-blocking)
      for (const photo of photos) {
        try {
          const form = new FormData();
          form.append('placeId', place.id);
          form.append('file', photo);
          form.append('description', t('photoDescription'));
          await fetch(`${API_URL}/photos/upload`, { method: 'POST', headers: authHeaders, body: form });
        } catch { /* photo upload is optional */ }
      }

      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/places/${place.id}`), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Not logged in
  if (isLoggedIn === false) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('errors.loginRequired')}</h1>
            <p className="text-gray-600 mb-6">{t('loginToAdd')}</p>
            <Button variant="primary" fullWidth className="min-h-[48px]" onClick={() => router.push(`/${locale}/profile`)}>
              {t('goToLogin')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoggedIn === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('success')}</h1>
            <p className="text-gray-600">{t('successMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="max-w-lg mx-auto px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{t('title')}</h1>
        <p className="text-sm text-gray-500 mb-4">{t('quickAdd')}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-4 text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: Place Name with autocomplete */}
          <div className="relative" ref={suggestionsRef}>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-1">
              1. {t('name')}
            </label>
            <input
              id="name"
              type="search"
              required
              autoComplete="off"
              autoFocus
              inputMode="search"
              value={name}
              onChange={(e) => { setName(e.target.value); setTouched(prev => ({ ...prev, name: true })); }}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px] text-base"
              placeholder={t('namePlaceholder')}
            />
            {loadingSuggestions && (
              <div className="absolute right-3 top-[38px]">
                <LoadingSpinner size="sm" />
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 text-xs text-gray-500 border-b bg-gray-50 rounded-t-xl">
                  {t('existingPlaces')}
                </div>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-100 last:border-0 min-h-[48px] transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{s.name}</div>
                    {s.address && <div className="text-xs text-gray-500 truncate">{s.address}</div>}
                  </button>
                ))}
                <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-b-xl">
                  {t('typeNewPlace')}
                </div>
              </div>
            )}
            {touched.name && !name && (
              <p className="mt-1 text-xs text-red-500">{t('missing.name')}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              2. {t('category')}
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 min-h-[64px] text-xs font-medium transition-all ${
                    category === cat.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  {t(`categories.${cat.value}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              3. {t('location')}
            </label>
            <LocationPicker onLocationChange={handleLocationChange} onAddressChange={handleAddressChange} />
            {touched.location && !latitude && (
              <p className="mt-1 text-xs text-red-500">{t('missing.location')}</p>
            )}
          </div>

          {/* Auto-filled address (shown if we have one) */}
          {address && (
            <div className="rounded-xl bg-gray-50 p-3">
              <label htmlFor="address" className="block text-xs font-medium text-gray-500 mb-1">
                {t('address')} ({t('autoFilled')})
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>
          )}

          {/* Optional: more fields (collapsed by default) */}
          <button
            type="button"
            onClick={() => setShowMoreFields(!showMoreFields)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
          >
            {showMoreFields ? '▾' : '▸'} {t('moreDetails')}
          </button>

          {showMoreFields && (
            <div className="space-y-4 rounded-xl bg-gray-50 p-4">
              <div>
                <label htmlFor="address-manual" className="block text-xs font-medium text-gray-500 mb-1">
                  {t('address')}
                </label>
                <input
                  id="address-manual"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  placeholder={t('addressPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-xs font-medium text-gray-500 mb-1">
                  {t('city')}
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                  placeholder={t('cityPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {t('photos')} <span className="text-gray-400">({t('photosOptional')})</span>
                </label>
                <PhotoUpload onPhotosChange={setPhotos} maxPhotos={5} />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="sticky bottom-0 bg-gray-50 -mx-4 px-4 py-3 border-t border-gray-200">
            <Button type="submit" variant="primary" fullWidth disabled={!canSubmit || submitting} className="min-h-[52px] rounded-xl text-base font-semibold">
              {submitting ? <LoadingSpinner size="sm" /> : (
                <>♿ {t('submit')}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

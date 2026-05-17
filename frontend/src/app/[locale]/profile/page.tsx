'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HeartIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { API_URL } from '@/lib/constants';

type Params = Promise<{ locale: string }>;

interface UserProfile {
  id: string;
  name: string;
  email: string;
  reviewCount: number;
  createdAt: string;
}

interface Review {
  id: string;
  placeId: string;
  placeName?: string;
  entrance: string;
  toilet: string;
  parking: string;
  internalNav: string;
  notes?: string;
  createdAt: string;
}

interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  name: string;
}

interface TokenPayload {
  sub?: string;
  email?: string;
}

const STORAGE_KEYS = {
  token: 'wheelcheck_token',
  userId: 'wheelcheck_user_id',
  userName: 'wheelcheck_user_name',
  userEmail: 'wheelcheck_user_email',
} as const;

export default function ProfilePage({ params }: { params: Params }) {
  const { locale } = use(params);
  const t = useTranslations('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token);

    if (!token) {
      setLoading(false);
      return;
    }

    const storedProfile = getStoredProfile(token);
    void fetchProfile(token, storedProfile);
  }, []);

  const parseToken = (token: string): TokenPayload | null => {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      return JSON.parse(window.atob(padded)) as TokenPayload;
    } catch {
      return null;
    }
  };

  const getStoredProfile = (token?: string): UserProfile | null => {
    const tokenPayload = token ? parseToken(token) : null;
    const id = localStorage.getItem(STORAGE_KEYS.userId) || tokenPayload?.sub || '';
    const storedEmail = localStorage.getItem(STORAGE_KEYS.userEmail) || tokenPayload?.email || '';
    const storedName =
      localStorage.getItem(STORAGE_KEYS.userName) ||
      (storedEmail ? storedEmail.split('@')[0] : '');

    if (!id || !storedEmail) {
      return null;
    }

    return {
      id,
      name: storedName,
      email: storedEmail,
      reviewCount: 0,
      createdAt: '',
    };
  };

  const persistProfile = (nextProfile: Pick<UserProfile, 'id' | 'name' | 'email'>) => {
    localStorage.setItem(STORAGE_KEYS.userId, nextProfile.id);
    localStorage.setItem(STORAGE_KEYS.userName, nextProfile.name);
    localStorage.setItem(STORAGE_KEYS.userEmail, nextProfile.email);
  };

  const clearStoredSession = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.userId);
    localStorage.removeItem(STORAGE_KEYS.userName);
    localStorage.removeItem(STORAGE_KEYS.userEmail);
  };

  const fetchReviews = async (userId: string) => {
    try {
      const reviewsRes = await fetch(`${API_URL}/reviews/user/${userId}`);
      if (!reviewsRes.ok) {
        setReviews([]);
        return;
      }

      const reviewsData = await reviewsRes.json();
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch {
      setReviews([]);
    }
  };

  const applyProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setIsLoggedIn(true);
    persistProfile(nextProfile);
  };

  const fetchProfile = async (token: string, fallbackProfile: UserProfile | null) => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const nextProfile: UserProfile = {
          id: data.id ?? fallbackProfile?.id ?? '',
          name: data.name ?? fallbackProfile?.name ?? '',
          email: data.email ?? fallbackProfile?.email ?? '',
          reviewCount: data.reviewCount ?? 0,
          createdAt: data.createdAt ?? '',
        };

        applyProfile(nextProfile);
        await fetchReviews(nextProfile.id);
        return;
      }

      if ((res.status === 404 || res.status === 405) && fallbackProfile) {
        applyProfile(fallbackProfile);
        await fetchReviews(fallbackProfile.id);
        return;
      }

      if (res.status === 401 || res.status === 403) {
        clearStoredSession();
        setProfile(null);
        setIsLoggedIn(false);
        setReviews([]);
        return;
      }

      if (fallbackProfile) {
        applyProfile(fallbackProfile);
        await fetchReviews(fallbackProfile.id);
        return;
      }

      clearStoredSession();
      setProfile(null);
      setIsLoggedIn(false);
      setReviews([]);
    } catch {
      if (fallbackProfile) {
        applyProfile(fallbackProfile);
        await fetchReviews(fallbackProfile.id);
      } else {
        clearStoredSession();
        setProfile(null);
        setIsLoggedIn(false);
        setReviews([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAuthForms = () => {
    setShowLogin(false);
    setShowRegister(false);
    setAuthError(null);
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error(t('errors.invalidCredentials'));
      }

      const data = (await res.json()) as AuthResponse;
      localStorage.setItem(STORAGE_KEYS.token, data.token);
      persistProfile({ id: data.userId, name: data.name, email: data.email });
      await fetchProfile(data.token, {
        id: data.userId,
        name: data.name,
        email: data.email,
        reviewCount: 0,
        createdAt: '',
      });
      resetAuthForms();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t('errors.loginFailed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || t('errors.registrationFailed'));
      }

      const data = (await res.json()) as AuthResponse;
      localStorage.setItem(STORAGE_KEYS.token, data.token);
      persistProfile({ id: data.userId, name: data.name, email: data.email });
      await fetchProfile(data.token, {
        id: data.userId,
        name: data.name,
        email: data.email,
        reviewCount: 0,
        createdAt: '',
      });
      resetAuthForms();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t('errors.registrationFailed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setProfile(null);
    setIsLoggedIn(false);
    setReviews([]);
    resetAuthForms();
  };

  const formatAccessLevel = (level: string) => {
    switch (level) {
      case 'FULL':
        return '✅';
      case 'PARTIAL':
        return '⚠️';
      case 'NOT_ACCESSIBLE':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center pb-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-full overflow-y-auto pb-16">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('loginPrompt')}</p>
        </div>

        {!showLogin && !showRegister && (
          <div className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setShowLogin(true);
                setShowRegister(false);
                setAuthError(null);
              }}
              className="min-h-[48px]"
            >
              {t('login')}
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setShowRegister(true);
                setShowLogin(false);
                setAuthError(null);
              }}
              className="min-h-[48px]"
            >
              {t('register')}
            </Button>
          </div>
        )}

        {showLogin && (
          <form onSubmit={handleLogin} className="space-y-4 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900">{t('login')}</h2>
            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
                {authError}
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={resetAuthForms} className="flex-1 min-h-[48px]">
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={authLoading} className="flex-1 min-h-[48px]">
                {authLoading ? <LoadingSpinner size="sm" /> : t('login')}
              </Button>
            </div>
          </form>
        )}

        {showRegister && (
          <form onSubmit={handleRegister} className="space-y-4 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900">{t('register')}</h2>
            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm" role="alert">
                {authError}
              </div>
            )}
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('displayName')}
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={resetAuthForms} className="flex-1 min-h-[48px]">
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={authLoading} className="flex-1 min-h-[48px]">
                {authLoading ? <LoadingSpinner size="sm" /> : t('register')}
              </Button>
            </div>
          </form>
        )}
      </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-16">
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-emerald-600">
              {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 break-words">{profile?.name}</h1>
            <p className="text-gray-600 break-all">{profile?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{profile?.reviewCount || reviews.length}</p>
            <p className="text-sm text-gray-600">{t('reviewsSubmitted')}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{reviews.length}</p>
            <p className="text-sm text-gray-600">{t('contributions')}</p>
          </div>
        </div>

        <Button variant="outline" fullWidth onClick={handleLogout} className="min-h-[48px]">
          {t('logout')}
        </Button>
      </div>

      {/* Saved Places quick-link */}
      <Link
        href={`/${locale}/favorites`}
        data-testid="saved-places-link"
        className="flex items-center justify-between bg-white rounded-lg shadow p-4 mb-6 hover:shadow-md transition-shadow group"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-red-50 p-2 group-hover:bg-red-100 transition-colors">
            <HeartIcon className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{t('savedPlaces')}</p>
            <p className="text-xs text-gray-500">{t('savedPlacesSubtext')}</p>
          </div>
        </div>
        <span className="text-emerald-600 text-sm font-medium">View →</span>
      </Link>

      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('reviewHistory')}</h2>
      {reviews.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500">{t('noReviews')}</p>
          <Link href={`/${locale}/places`} className="text-emerald-600 font-medium hover:underline mt-2 inline-block min-h-[48px] leading-[48px]">
            {t('startReporting')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Link
              key={review.id}
              href={`/${locale}/places/${review.placeId}`}
              className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {review.placeName && (
                <p className="font-semibold text-gray-900 mb-1 truncate">{review.placeName}</p>
              )}
              <div className="flex items-center gap-2 mb-2 text-lg">
                <span>{formatAccessLevel(review.entrance)}</span>
                <span>{formatAccessLevel(review.toilet)}</span>
                <span>{formatAccessLevel(review.parking)}</span>
                <span>{formatAccessLevel(review.internalNav)}</span>
              </div>
              {review.notes && <p className="text-sm text-gray-600 mb-1">{review.notes}</p>}
              <p className="text-xs text-gray-400">
                {new Intl.DateTimeFormat(locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(review.createdAt))}
              </p>
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

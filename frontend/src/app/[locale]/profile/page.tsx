'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HeartIcon } from '@heroicons/react/24/solid';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '@/lib/constants';

type Params = Promise<{ locale: string }>;

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

export default function ProfilePage({ params }: { params: Params }) {
  const { locale } = use(params);
  const t = useTranslations('profile');
  const {
    user,
    isLoggedIn,
    loading: authLoading,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUp,
    signOut,
    getAccessToken,
  } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    void fetchReviews(user.id);
  }, [isLoggedIn, user]);

  const fetchReviews = async (userId: string) => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`${API_URL}/reviews/user/${userId}`);
      if (!res.ok) {
        setReviews([]);
        return;
      }
      const data = await res.json();
      const reviewsArr = Array.isArray(data) ? data : [];
      setReviews(reviewsArr);
      setReviewCount(reviewsArr.length);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(t('errors.socialLoginFailed'));
    }
  };

  const handleGitHubLogin = async () => {
    setAuthError(null);
    const { error } = await signInWithGitHub();
    if (error) {
      setAuthError(t('errors.socialLoginFailed'));
    }
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);

    const { error } = await signInWithEmail(email, password);
    if (error) {
      setAuthError(t('errors.invalidCredentials'));
    } else {
      resetForms();
    }
    setSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setAuthError(null);

    const { data, error } = await signUp(email, password, name);
    if (error) {
      setAuthError(t('errors.registrationFailed'));
    } else if (data.user && !data.session) {
      // Email confirmation required
      setAuthError(t('errors.emailConfirmation'));
    } else {
      resetForms();
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await signOut();
    setReviews([]);
    setReviewCount(0);
    resetForms();
  };

  const resetForms = () => {
    setShowEmailForm(false);
    setShowRegister(false);
    setAuthError(null);
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  };

  const formatAccessLevel = (level: string) => {
    switch (level) {
      case 'FULL':
        return '\u2705';
      case 'PARTIAL':
        return '\u26A0\uFE0F';
      case 'NOT_ACCESSIBLE':
        return '\u274C';
      default:
        return '\u2753';
    }
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    '';

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center pb-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{'\uD83D\uDC64'}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
            <p className="text-gray-600">{t('loginPrompt')}</p>
          </div>

          {authError && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4"
              role="alert"
            >
              {authError}
            </div>
          )}

          {!showEmailForm && !showRegister && (
            <div className="space-y-3">
              {/* Google login */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 min-h-[48px] text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                aria-label={t('continueWithGoogle')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('continueWithGoogle')}
              </button>

              {/* GitHub login */}
              <button
                onClick={handleGitHubLogin}
                className="w-full flex items-center justify-center gap-3 bg-gray-900 rounded-lg px-4 py-3 min-h-[48px] text-white font-medium hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                aria-label={t('continueWithGitHub')}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                {t('continueWithGitHub')}
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-50 px-4 text-gray-500">{t('orUseEmail')}</span>
                </div>
              </div>

              {/* Email login button */}
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setShowEmailForm(true);
                  setShowRegister(false);
                  setAuthError(null);
                  setShowPassword(false);
                }}
                className="min-h-[48px]"
              >
                {t('emailLogin')}
              </Button>

              <p className="text-center text-sm text-gray-500 mt-2">
                {t('createAccountPrompt')}{' '}
                <button
                  onClick={() => {
                    setShowRegister(true);
                    setShowEmailForm(false);
                    setAuthError(null);
                    setShowPassword(false);
                  }}
                  className="text-emerald-600 font-medium hover:underline"
                >
                  {t('createAccountLink')}
                </button>
              </p>
            </div>
          )}

          {showEmailForm && (
            <form onSubmit={handleEmailLogin} className="space-y-4 bg-white rounded-lg shadow-lg p-6">
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
                  name="email"
                  autoComplete="email"
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
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="current-password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    data-testid="password-toggle"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword
                      ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                      : <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    }
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={resetForms} className="flex-1 min-h-[48px]">
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={submitting} className="flex-1 min-h-[48px]">
                  {submitting ? <LoadingSpinner size="sm" /> : t('login')}
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
                  name="name"
                  autoComplete="name"
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
                  name="email"
                  autoComplete="email"
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
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    name="new-password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    data-testid="password-toggle"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword
                      ? <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                      : <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    }
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={resetForms} className="flex-1 min-h-[48px]">
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={submitting} className="flex-1 min-h-[48px]">
                  {submitting ? <LoadingSpinner size="sm" /> : t('register')}
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt=""
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-2xl font-bold text-emerald-600">
                {displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 break-words">{displayName}</h1>
            <p className="text-gray-600 break-all">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{reviewCount || reviews.length}</p>
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
        <span className="text-emerald-600 text-sm font-medium">View &rarr;</span>
      </Link>

      <h2 className="text-lg font-bold text-gray-900 mb-4">{t('reviewHistory')}</h2>
      {loadingReviews ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : reviews.length === 0 ? (
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

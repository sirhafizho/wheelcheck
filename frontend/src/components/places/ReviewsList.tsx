'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PencilIcon } from '@heroicons/react/24/outline';
import type { AccessReport, AccessLevel } from '@/lib/types';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { Toast } from '../ui/Toast';

interface ReviewsListProps {
  placeId: string;
  locale: string;
}

interface ReviewEditForm {
  entrance: AccessLevel;
  toilet: AccessLevel;
  parking: AccessLevel;
  internalNav: AccessLevel;
  notes: string;
}

interface RatingRowProps {
  label: string;
  level: AccessLevel;
  levelLabels: Record<AccessLevel, string>;
}

interface RatingSelectProps {
  id: string;
  label: string;
  value: AccessLevel;
  levelLabels: Record<AccessLevel, string>;
  onChange: (value: AccessLevel) => void;
}

const levelEmoji: Record<AccessLevel, string> = {
  FULL: '✅',
  PARTIAL: '⚠️',
  NOT_ACCESSIBLE: '❌',
  UNKNOWN: '❓',
};

const ACCESS_LEVEL_OPTIONS: AccessLevel[] = ['FULL', 'PARTIAL', 'NOT_ACCESSIBLE', 'UNKNOWN'];

function buildEditForm(review: AccessReport): ReviewEditForm {
  return {
    entrance: review.entrance,
    toilet: review.toilet,
    parking: review.parking,
    internalNav: review.internalNav,
    notes: review.notes ?? '',
  };
}

function RatingRow({ label, level, levelLabels }: RatingRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium">
        {levelEmoji[level]} {levelLabels[level]}
      </span>
    </div>
  );
}

function RatingSelect({ id, label, value, levelLabels, onChange }: RatingSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as AccessLevel)}
        className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {ACCESS_LEVEL_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {levelEmoji[option]} {levelLabels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ReviewsList({ placeId, locale }: ReviewsListProps) {
  const t = useTranslations('reviews');
  const tAccess = useTranslations('access');
  const tCommon = useTranslations('common');
  const [reviews, setReviews] = useState<AccessReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReviewEditForm | null>(null);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const levelLabels: Record<AccessLevel, string> = {
    FULL: tAccess('full'),
    PARTIAL: tAccess('partial'),
    NOT_ACCESSIBLE: tAccess('notAccessible'),
    UNKNOWN: tAccess('unknown'),
  };

  useEffect(() => {
    setCurrentUserId(localStorage.getItem('wheelcheck_user_id'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api.getPlaceReports(placeId).then((data) => {
      if (!cancelled) {
        setReviews(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  const formatDate = (dateString: string) => new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));

  const startEditing = useCallback((review: AccessReport) => {
    setEditingReviewId(review.id);
    setEditForm(buildEditForm(review));
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingReviewId(null);
    setEditForm(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingReviewId || !editForm) {
      return;
    }

    const token = localStorage.getItem('wheelcheck_token');
    if (!token) {
      setToast({ message: tCommon('error'), type: 'error' });
      return;
    }

    setSavingReviewId(editingReviewId);

    try {
      const response = await fetch(`${API_URL}/reviews/${editingReviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entrance: editForm.entrance,
          toilet: editForm.toilet,
          parking: editForm.parking,
          internalNav: editForm.internalNav,
          notes: editForm.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update review');
      }

      const updated = await response.json() as AccessReport;
      setReviews((prev) => prev.map((review) => (review.id === updated.id ? updated : review)));
      cancelEditing();
      setToast({ message: t('editSaved'), type: 'success' });
    } catch {
      setToast({ message: tCommon('error'), type: 'error' });
    } finally {
      setSavingReviewId(null);
    }
  }, [cancelEditing, editForm, editingReviewId, t, tCommon]);

  if (loading) {
    return (
      <div className="py-4 text-center text-gray-500 text-sm">
        {t('loading')}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-gray-500 text-sm">{t('noReports')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="reviews-list">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <h2 className="text-lg font-semibold text-gray-900">
        {t('title', { count: reviews.length })}
      </h2>

      {reviews.map((review) => {
        const isOwnReview = Boolean(currentUserId && review.userId && currentUserId === review.userId);
        const isEditing = editingReviewId === review.id && Boolean(editForm);
        const isSaving = savingReviewId === review.id;

        return (
          <div
            key={review.id}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            data-testid="review-card"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-medium text-emerald-700">
                  {(review.userName || 'A')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {review.userName || t('anonymous')}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {review.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ {t('verified')}
                  </span>
                )}
                {isOwnReview && (
                  <button
                    type="button"
                    onClick={() => startEditing(review)}
                    disabled={isSaving}
                    aria-label={t('editReview')}
                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {isEditing && editForm ? (
              <div className="space-y-4 rounded-lg bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <RatingSelect
                    id={`review-entrance-${review.id}`}
                    label={t('entrance')}
                    value={editForm.entrance}
                    levelLabels={levelLabels}
                    onChange={(value) => setEditForm((prev) => (prev ? { ...prev, entrance: value } : prev))}
                  />
                  <RatingSelect
                    id={`review-toilet-${review.id}`}
                    label={t('toilet')}
                    value={editForm.toilet}
                    levelLabels={levelLabels}
                    onChange={(value) => setEditForm((prev) => (prev ? { ...prev, toilet: value } : prev))}
                  />
                  <RatingSelect
                    id={`review-parking-${review.id}`}
                    label={t('parking')}
                    value={editForm.parking}
                    levelLabels={levelLabels}
                    onChange={(value) => setEditForm((prev) => (prev ? { ...prev, parking: value } : prev))}
                  />
                  <RatingSelect
                    id={`review-internal-${review.id}`}
                    label={t('internal')}
                    value={editForm.internalNav}
                    levelLabels={levelLabels}
                    onChange={(value) => setEditForm((prev) => (prev ? { ...prev, internalNav: value } : prev))}
                  />
                </div>
                <div>
                  <label htmlFor={`review-notes-${review.id}`} className="mb-1 block text-xs font-medium text-gray-500">{t('notes')}</label>
                  <textarea
                    id={`review-notes-${review.id}`}
                    value={editForm.notes}
                    onChange={(event) => setEditForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSaving ? '...' : t('saveChanges')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('cancelEdit')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1 mb-3 bg-white rounded-md p-3">
                  <RatingRow label={t('entrance')} level={review.entrance} levelLabels={levelLabels} />
                  <RatingRow label={t('toilet')} level={review.toilet} levelLabels={levelLabels} />
                  <RatingRow label={t('parking')} level={review.parking} levelLabels={levelLabels} />
                  <RatingRow label={t('internal')} level={review.internalNav} levelLabels={levelLabels} />
                </div>

                {review.notes && (
                  <p className="text-sm text-gray-700 mb-3 italic">&ldquo;{review.notes}&rdquo;</p>
                )}
              </>
            )}

            {review.photoUrls && review.photoUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {review.photoUrls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExpandedPhoto(url)}
                    className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-emerald-500 transition-all"
                  >
                    <img
                      src={url.startsWith('http') ? url : `http://localhost:8080${url}`}
                      alt={t('evidencePhoto', { number: idx + 1 })}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {expandedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
        >
          <img
            src={expandedPhoto.startsWith('http') ? expandedPhoto : `http://localhost:8080${expandedPhoto}`}
            alt={t('fullSizeEvidencePhoto')}
            className="max-w-full max-h-full rounded-lg"
          />
          <button
            type="button"
            onClick={() => setExpandedPhoto(null)}
            aria-label={t('closePhoto')}
            className="absolute top-4 right-4 text-white text-2xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

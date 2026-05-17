'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AccessReport, AccessLevel } from '@/lib/types';
import { api } from '@/lib/api';

interface ReviewsListProps {
  placeId: string;
  locale: string;
}

const levelEmoji: Record<AccessLevel, string> = {
  FULL: '✅',
  PARTIAL: '⚠️',
  NOT_ACCESSIBLE: '❌',
  UNKNOWN: '❓',
};

function RatingRow({
  label,
  level,
  levelLabels,
}: {
  label: string;
  level: AccessLevel;
  levelLabels: Record<AccessLevel, string>;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium">
        {levelEmoji[level]} {levelLabels[level]}
      </span>
    </div>
  );
}

export function ReviewsList({ placeId, locale }: ReviewsListProps) {
  const t = useTranslations('reviews');
  const tAccess = useTranslations('access');
  const [reviews, setReviews] = useState<AccessReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const levelLabels: Record<AccessLevel, string> = {
    FULL: tAccess('full'),
    PARTIAL: tAccess('partial'),
    NOT_ACCESSIBLE: tAccess('notAccessible'),
    UNKNOWN: tAccess('unknown'),
  };

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
      <h2 className="text-lg font-semibold text-gray-900">
        {t('title', { count: reviews.length })}
      </h2>

      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          data-testid="review-card"
        >
          <div className="flex items-center justify-between mb-3">
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
            {review.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                ✓ {t('verified')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 mb-3 bg-white rounded-md p-3">
            <RatingRow label={t('entrance')} level={review.entrance} levelLabels={levelLabels} />
            <RatingRow label={t('toilet')} level={review.toilet} levelLabels={levelLabels} />
            <RatingRow label={t('parking')} level={review.parking} levelLabels={levelLabels} />
            <RatingRow label={t('internal')} level={review.internalNav} levelLabels={levelLabels} />
          </div>

          {review.notes && (
            <p className="text-sm text-gray-700 mb-3 italic">&ldquo;{review.notes}&rdquo;</p>
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
      ))}

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

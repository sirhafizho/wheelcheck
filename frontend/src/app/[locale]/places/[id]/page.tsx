'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePlace } from '@/hooks/usePlaces';
import { PlaceDetail } from '@/components/places/PlaceDetail';
import { ReviewsList } from '@/components/places/ReviewsList';
import { CommentSection } from '@/components/places/CommentSection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';

type Params = Promise<{ locale: string; id: string }>;

interface PlaceDetailPageProps {
  params: Params;
}

export default function PlaceDetailPage({ params }: PlaceDetailPageProps) {
  const { locale, id } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const { place, loading, error } = usePlace(id);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Back button skeleton */}
          <div className="h-9 w-20 rounded-lg bg-gray-200 animate-pulse mb-2" />

          {/* PlaceDetail card skeleton — matches bg-white rounded-lg shadow-lg p-6 */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              {/* Row 1: h1 text-2xl + heart button + access badge */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="h-8 flex-1 rounded-lg bg-gray-200 animate-pulse" />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-8 w-24 rounded-full bg-gray-200 animate-pulse" />
                </div>
              </div>
              {/* Row 2: address (pin icon + text) */}
              <div className="flex items-start gap-2 mb-1">
                <div className="mt-0.5 h-5 w-5 rounded bg-gray-200 animate-pulse shrink-0" />
                <div className="h-5 flex-1 rounded bg-gray-200 animate-pulse" />
              </div>
              {/* Row 3: city/state */}
              <div className="h-4 w-40 rounded bg-gray-200 animate-pulse pl-7 mb-4" />
              {/* Category pill */}
              <div className="mb-4 h-7 w-32 rounded-full bg-gray-200 animate-pulse" />
              {/* Stats grid — 2 cols */}
              <div className="border-t border-gray-100 pt-4 mb-6 grid grid-cols-2 gap-4">
                <div className="h-10 rounded-lg bg-gray-200 animate-pulse" />
                <div className="h-10 rounded-lg bg-gray-200 animate-pulse" />
                <div className="col-span-2 h-10 rounded-lg bg-gray-100 animate-pulse" />
              </div>
              {/* Action buttons — sm:2-col + full-width */}
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-12 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="h-12 rounded-lg bg-gray-200 animate-pulse" />
                </div>
                <div className="h-12 w-full rounded-lg bg-gray-200 animate-pulse" />
              </div>
            </div>
          </div>

          {/* ReviewsList card skeleton */}
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="h-6 w-28 rounded bg-gray-200 animate-pulse" />
            <div className="h-16 w-full rounded-lg bg-gray-100 animate-pulse" />
            <div className="h-16 w-full rounded-lg bg-gray-100 animate-pulse" />
          </div>

          {/* CommentSection card skeleton */}
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="h-6 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-24 w-full rounded-lg bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
            {error || t('places.notFound')}
          </div>
          <Button onClick={() => router.back()}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-16">
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-2"
      >
        ← {t('common.back')}
      </Button>

      <PlaceDetail
        place={place}
        locale={locale}
        onDelete={() => router.push(`/${locale}`)}
        onEdit={() => router.push(`/${locale}/edit-place/${place.id}`)}
        onReportClick={() => router.push(`/${locale}/report/${place.id}`)}
        onShowOnMapClick={() => router.push(`/${locale}?placeId=${place.id}&lat=${place.latitude}&lng=${place.longitude}`)}
      />

      <div className="bg-white rounded-lg shadow-lg p-6">
        <ReviewsList placeId={place.id} locale={locale} />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <CommentSection placeId={place.id} locale={locale} />
      </div>
    </div>
    </div>
  );
}

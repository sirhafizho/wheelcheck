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
        <div className="bg-white rounded-lg shadow-lg overflow-hidden m-4">
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="h-7 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
              <div className="h-8 w-24 rounded-full bg-gray-200 animate-pulse shrink-0" />
            </div>
            <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
            <div className="h-20 w-full rounded-lg bg-gray-100 animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 rounded-lg bg-gray-200 animate-pulse" />
              <div className="h-12 rounded-lg bg-gray-200 animate-pulse" />
            </div>
            <div className="h-12 w-full rounded-lg bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
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

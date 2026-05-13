'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ReportWizard } from '@/components/report/ReportWizard';
import { usePlace } from '@/hooks/usePlaces';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import type { CreateReportRequest } from '@/lib/types';

type Params = Promise<{ locale: string; placeId: string }>;

interface ReportPageProps {
  params: Params;
}

export default function ReportPage({ params }: ReportPageProps) {
  const { locale, placeId } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const { place, loading } = usePlace(placeId);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (report: CreateReportRequest) => {
    try {
      await api.createReport(report);
      setSubmitted(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/${locale}/places/${placeId}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center pb-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!place) {
    return (
      <div className="h-full overflow-y-auto pb-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4">
            Place not found
          </div>
          <Button onClick={() => router.back()}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="h-full overflow-y-auto pb-16">
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('report.thanks')}
          </h1>
          <p className="text-gray-600">
            {t('report.submitted')}
          </p>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-16">
    <div className="max-w-4xl mx-auto px-4 py-6">
      <ReportWizard
        placeId={placeId}
        placeName={place.name}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
    </div>
  );
}

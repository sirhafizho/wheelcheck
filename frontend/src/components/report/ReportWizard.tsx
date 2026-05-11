'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/Button';
import { QuestionStep } from './QuestionStep';
import { PhotoUpload } from './PhotoUpload';
import type { CreateReportRequest } from '@/lib/types';

interface ReportWizardProps {
  placeId: string;
  placeName: string;
  onSubmit: (report: CreateReportRequest) => Promise<void>;
  onCancel?: () => void;
}

type StepId = 'entrance' | 'toilet' | 'parking' | 'internalNav' | 'photos' | 'notes';

export function ReportWizard({ placeId, placeName, onSubmit, onCancel }: ReportWizardProps) {
  const t = useTranslations('report');
  const [currentStep, setCurrentStep] = useState<StepId>('entrance');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateReportRequest>>({
    placeId,
  });

  const steps: StepId[] = ['entrance', 'toilet', 'parking', 'internalNav', 'photos', 'notes'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleAnswer = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    } else {
      onCancel?.();
    }
  };

  const handlePhotos = (photos: File[]) => {
    setFormData((prev) => ({ ...prev, photos }));
  };

  const handleSubmit = async () => {
    if (!formData.entrance || !formData.toilet || !formData.parking || !formData.internalNav) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData as CreateReportRequest);
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = currentStepIndex === steps.length - 1;
  const canProceed = formData[currentStep as keyof CreateReportRequest] !== undefined || 
                     currentStep === 'photos' || 
                     currentStep === 'notes';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h2>
        <p className="text-gray-600">{placeName}</p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={(currentStepIndex + 1) / steps.length * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="mb-8">
        {currentStep === 'entrance' && (
          <QuestionStep
            question={t('entrance')}
            options={[
              { value: 'FULL', label: t('entranceOptions.full') },
              { value: 'PARTIAL', label: t('entranceOptions.partial') },
              { value: 'NOT_ACCESSIBLE', label: t('entranceOptions.notAccessible') },
              { value: 'UNKNOWN', label: t('entranceOptions.unknown') },
            ]}
            value={formData.entrance}
            onChange={(value) => handleAnswer('entrance', value)}
          />
        )}
        {currentStep === 'toilet' && (
          <QuestionStep
            question={t('toilet')}
            options={[
              { value: 'FULL', label: t('toiletOptions.full') },
              { value: 'PARTIAL', label: t('toiletOptions.partial') },
              { value: 'NOT_ACCESSIBLE', label: t('toiletOptions.notAccessible') },
              { value: 'UNKNOWN', label: t('toiletOptions.unknown') },
            ]}
            value={formData.toilet}
            onChange={(value) => handleAnswer('toilet', value)}
          />
        )}
        {currentStep === 'parking' && (
          <QuestionStep
            question={t('parking')}
            options={[
              { value: 'FULL', label: t('parkingOptions.full') },
              { value: 'PARTIAL', label: t('parkingOptions.partial') },
              { value: 'NOT_ACCESSIBLE', label: t('parkingOptions.notAccessible') },
              { value: 'UNKNOWN', label: t('parkingOptions.unknown') },
            ]}
            value={formData.parking}
            onChange={(value) => handleAnswer('parking', value)}
          />
        )}
        {currentStep === 'internalNav' && (
          <QuestionStep
            question={t('internal')}
            options={[
              { value: 'FULL', label: t('internalOptions.full') },
              { value: 'PARTIAL', label: t('internalOptions.partial') },
              { value: 'NOT_ACCESSIBLE', label: t('internalOptions.notAccessible') },
              { value: 'UNKNOWN', label: t('internalOptions.unknown') },
            ]}
            value={formData.internalNav}
            onChange={(value) => handleAnswer('internalNav', value)}
          />
        )}
        {currentStep === 'photos' && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t('photos')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('photoHint')}</p>
            <PhotoUpload
              onPhotosChange={handlePhotos}
              maxPhotos={5}
            />
          </div>
        )}
        {currentStep === 'notes' && (
          <div>
            <label htmlFor="notes" className="block text-lg font-semibold mb-2">
              {t('additionalNotes')}
            </label>
            <textarea
              id="notes"
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Any additional information..."
              value={formData.notes || ''}
              onChange={(e) => handleAnswer('notes', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1"
        >
          {t('back')}
        </Button>
        {isLastStep ? (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? t('submitting') : t('submit')}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed}
            className="flex-1"
          >
            {t('next')}
          </Button>
        )}
      </div>
    </div>
  );
}

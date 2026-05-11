'use client';

import { use, useState } from 'react';
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

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = Boolean(
    formData.name &&
      formData.address &&
      formData.category &&
      formData.latitude &&
      formData.longitude &&
      photos.length > 0
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('wheelcheck_token');
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || t('errors.createPlace'));
      }

      const place = await response.json();

      for (const photo of photos) {
        const form = new FormData();
        form.append('placeId', place.id);
        form.append('file', photo);
        form.append('description', t('photoDescription'));

        const uploadResponse = await fetch(`${API_URL}/photos/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: form,
        });

        if (!uploadResponse.ok) {
          const data = await uploadResponse.json().catch(() => ({}));
          throw new Error(data.message || t('errors.uploadPhoto'));
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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('success')}</h1>
          <p className="text-gray-600">{t('successMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-4" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            {t('name')} *
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
            placeholder={t('namePlaceholder')}
          />
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
              {t('latitude')} *
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              required
              value={formData.latitude}
              onChange={(e) => handleChange('latitude', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              placeholder="3.1578"
            />
          </div>
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
              {t('longitude')} *
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              required
              value={formData.longitude}
              onChange={(e) => handleChange('longitude', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              placeholder="101.7117"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('photos')} * <span className="text-red-500">({t('photosRequired')})</span>
          </label>
          <p className="text-sm text-gray-500 mb-2">{t('photosHint')}</p>
          <PhotoUpload onPhotosChange={setPhotos} maxPhotos={5} />
          {photos.length === 0 && <p className="text-sm text-red-500 mt-1">{t('photosRequiredError')}</p>}
        </div>

        <Button type="submit" variant="primary" fullWidth disabled={!canSubmit || submitting} className="min-h-[48px]">
          {submitting ? <LoadingSpinner size="sm" /> : t('submit')}
        </Button>
      </form>
    </div>
  );
}

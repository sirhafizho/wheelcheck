'use client';

import { useState, useRef } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';

interface PhotoUploadProps {
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ onPhotosChange, maxPhotos = 5 }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxPhotos - photos.length;
    const newPhotos = files.slice(0, remaining);

    if (newPhotos.length > 0) {
      const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));
      
      const updatedPhotos = [...photos, ...newPhotos];
      const updatedPreviews = [...previews, ...newPreviews];
      
      setPhotos(updatedPhotos);
      setPreviews(updatedPreviews);
      onPhotosChange(updatedPhotos);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    
    setPhotos(updatedPhotos);
    setPreviews(updatedPreviews);
    onPhotosChange(updatedPhotos);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        id="photo-upload"
        aria-label="Upload photos"
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="
                  absolute top-2 right-2
                  p-1 bg-red-600 text-white rounded-full
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                  focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500
                "
                aria-label={`Remove photo ${index + 1}`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < maxPhotos && (
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => fileInputRef.current?.click()}
        >
          <CameraIcon className="w-5 h-5 mr-2" aria-hidden="true" />
          Add Photo ({photos.length}/{maxPhotos})
        </Button>
      )}
    </div>
  );
}

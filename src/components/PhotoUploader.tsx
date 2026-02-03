import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useBookStore } from '../store/bookStore';
import { validatePhoto } from '../utils/validators';
import { imageToBase64, preprocessPhoto } from '../utils/imageProcessor';

interface PhotoUploaderProps {
  onError?: (message: string) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onError }) => {
  const { uploadedPhoto, processedPhoto, setUploadedPhoto, setProcessedPhoto } = useBookStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validatePhoto(file);
    if (!validation.isValid) {
      onError?.(validation.error || 'Invalid file');
      return;
    }

    try {
      setUploadedPhoto(file);
      const processed = await preprocessPhoto(file);
      setProcessedPhoto(processed);
    } catch (err) {
      onError?.('Failed to process image');
    }
  }, [setUploadedPhoto, setProcessedPhoto, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024
  });

  const removePhoto = () => {
    setUploadedPhoto(null);
    setProcessedPhoto(null);
  };

  return (
    <div className="space-y-4">
      <label className="block text-lg font-semibold text-foreground">
        Upload a Photo 📸
      </label>

      {processedPhoto ? (
        <div className="relative animate-scale-in">
          <div className="relative w-40 h-40 mx-auto rounded-2xl overflow-hidden shadow-float border-4 border-primary/30">
            <img
              src={processedPhoto.circular}
              alt="Uploaded preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={removePhoto}
              className="absolute top-2 right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            >
              <X className="w-4 h-4 text-destructive-foreground" />
            </button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3">
            {uploadedPhoto?.name}
          </p>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
            transition-all duration-300 hover:border-primary hover:bg-primary/5
            ${isDragActive 
              ? 'border-primary bg-primary/10 scale-102' 
              : 'border-border bg-card'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className={`
              w-16 h-16 rounded-full bg-secondary flex items-center justify-center
              ${isDragActive ? 'animate-bounce' : 'animate-float'}
            `}>
              {isDragActive ? (
                <ImageIcon className="w-8 h-8 text-primary" />
              ) : (
                <Upload className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {isDragActive ? 'Drop the photo here!' : 'Drag & drop a photo'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse (JPG, PNG - max 5MB)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

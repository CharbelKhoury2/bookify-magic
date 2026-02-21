import { ProcessedPhoto } from './types';

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        let width = img.width;
        let height = img.height;
        const maxSize = 1200;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function imageToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function createCircularPhoto(imageUrl: string, size: number = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const scale = Math.max(size / img.width, size / img.height);
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for circular processing'));
    img.src = imageUrl;
  });
}

export async function preprocessPhoto(file: File): Promise<ProcessedPhoto> {
  try {
    const compressed = await compressImage(file);
    const compressedUrl = await imageToBase64(compressed);
    const circular = await createCircularPhoto(compressedUrl, 400);
    const thumbnail = await createCircularPhoto(compressedUrl, 100);

    return { original: compressedUrl, circular, thumbnail };
  } catch (error) {
    throw new Error('Failed to process photo');
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return imageToBase64(file);
}

export async function processPhotoForPDF(file: File): Promise<string> {
  const compressed = await compressImage(file);
  return imageToBase64(compressed);
}

export function createThumbnail(file: File, size: number = 100): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const circular = await createCircularPhoto(e.target?.result as string, size);
        resolve(circular);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

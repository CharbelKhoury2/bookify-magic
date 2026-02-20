import { Theme } from './types';
import { imageToBase64 } from './imageProcessor';
import { supabase } from '@/integrations/supabase/client';

export interface GenerationStartResponse {
  status?: string;
  jobId?: string;
  statusUrl?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  pdfBlob?: Blob;
  coverImageUrl?: string;
  coverImageBase64?: string;
  message?: string;
}

export interface GenerationStatusResponse {
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  pdfUrl?: string;
  pdfBase64?: string;
  coverImageUrl?: string;
  coverImageBase64?: string;
  message?: string;
}

export async function startGenerationViaWebhook(
  childName: string,
  theme: Theme,
  photoFile: File,
  onProgress?: (p: number) => void
): Promise<{
  pdfBlob?: Blob;
  pdfUrl?: string;
  coverImageUrl?: string;
  pdfDownloadUrl?: string;
  coverDownloadUrl?: string;
}> {
  onProgress?.(5);
  const photoBase64 = await imageToBase64(photoFile);
  onProgress?.(10);

  const payload = {
    childName: childName.trim(),
    themeId: theme.id,
    themeName: theme.name,
    photoBase64,
    photoMime: photoFile.type || 'image/jpeg',
  };

  console.log('🚀 Sending book request via edge function');

  const { data, error } = await supabase.functions.invoke('generate-book', {
    body: payload,
  });

  if (error) {
    console.error('❌ Edge function error:', error);
    throw new Error(error.message || 'Book generation service error');
  }

  console.log('📦 Received response from edge function:', data);
  const start: GenerationStartResponse = data;

  // If direct PDF binary response
  if (start.pdfBlob) {
    onProgress?.(100);
    return { pdfBlob: start.pdfBlob };
  }

  // 1. Array-like response (common in n8n/multi-file uploads)
  const s = start as any;
  const items = Array.isArray(start) ? start : (s.files || s.items || (s.result && Array.isArray(s.result) ? s.result : null));

  if (items && Array.isArray(items)) {
    console.log('📦 Processing items from response:', items.length);

    const pdfItem = items.find((item: any) =>
      (item.mimeType === 'application/pdf') ||
      (item.name?.toLowerCase().endsWith('.pdf')) ||
      (item.contentType === 'application/pdf') ||
      (typeof item === 'string' && (item.endsWith('.pdf') || item.includes('application/pdf')))
    );

    const coverItem = items.find((item: any) =>
      (item.mimeType?.startsWith('image/')) ||
      (item.name?.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) ||
      (item.name?.toLowerCase().includes('cover')) ||
      (item.name?.toLowerCase().includes('thumb'))
    );

    const pdfData = extractFileData(pdfItem || (pdfItem === undefined ? items.find((i: any) => extractFileData(i).url || extractFileData(i).base64) : null));
    const coverData = extractFileData(coverItem);

    if (pdfData.url || pdfData.base64 || pdfData.blob) {
      console.log('🎉 Successfully extracted final data from items');
      onProgress?.(100);

      let pdfBlob = pdfData.blob;
      if (pdfData.base64 && !pdfBlob) {
        pdfBlob = base64ToBlob(pdfData.base64, 'application/pdf');
      }

      const result = {
        pdfUrl: pdfData.previewUrl || pdfData.url,
        pdfBlob: pdfBlob,
        coverImageUrl: coverData.previewUrl || coverData.url || (coverData.base64 ? `data:image/jpeg;base64,${coverData.base64.replace(/^data:image\/[a-z]+;base64,/, '')}` : undefined),
        pdfDownloadUrl: pdfData.downloadUrl || pdfData.url,
        coverDownloadUrl: coverData.downloadUrl || coverData.url
      };

      console.log('✨ Extracted file data:', {
        hasPdf: !!result.pdfUrl || !!result.pdfBlob,
        hasCover: !!result.coverImageUrl,
        pdfUrl: result.pdfUrl?.substring(0, 50) + '...',
        coverUrl: result.coverImageUrl?.substring(0, 50) + '...'
      });

      return result;
    }
  }

  // 2. Synchronous response with explicit fields (direct or Base64)
  const pdfUrl = s.pdfUrl || s.pdf_url || s.url || (typeof start === 'string' && (start as string).startsWith('http') ? start : undefined);
  const pdfBase64 = s.pdfBase64 || s.pdf_base64 || s.pdf_data || s.data || (typeof start === 'string' && (start as string).length > 1000 ? start : undefined);
  let coverImageUrl = s.coverImageUrl || s.cover_url || s.thumbnailUrl || s.image_url;

  if (s.coverImageBase64 || s.cover_base64 || s.image_data) {
    const b64 = s.coverImageBase64 || s.cover_base64 || s.image_data;
    coverImageUrl = `data:image/jpeg;base64,${b64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
  }

  if (pdfBase64 || pdfUrl) {
    onProgress?.(90);
    if (pdfBase64) {
      const pdfBlob = base64ToBlob(pdfBase64, 'application/pdf');
      onProgress?.(100);
      return { pdfBlob, coverImageUrl };
    }
    onProgress?.(100);
    return { pdfUrl, coverImageUrl };
  }

  // Polling not supported via edge function proxy - if no immediate result, error
  throw new Error('No PDF was returned from the book generation service.');
}

function base64ToBlob(base64: string, mime: string) {
  const actualBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteChars = atob(actualBase64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

/**
 * Aggressively extracts a URL or Base64 data from a variety of object shapes
 */
function extractFileData(obj: any): { url?: string, previewUrl?: string, downloadUrl?: string, base64?: string, blob?: Blob } {
  if (!obj) return {};

  // If object is already a string
  if (typeof obj === 'string') {
    if (obj.startsWith('http')) return { url: obj };
    if (obj.length > 200 || obj.includes(';base64,')) return { base64: obj };
    return {};
  }

  // Handle Google Drive objects specifically
  if (obj.kind === 'drive#file' || obj.webContentLink || obj.webViewLink) {
    const downloadUrl = obj.webContentLink;
    let previewUrl = obj.webViewLink;

    // Convert view link to preview link for iframes
    if (previewUrl && previewUrl.includes('/view')) {
      previewUrl = previewUrl.replace('/view', '/preview');
    }

    // Special handling for images to use the thumbnail link for preview
    if (obj.mimeType?.startsWith('image/')) {
      previewUrl = `https://drive.google.com/thumbnail?id=${obj.id}&sz=w1000`;
    }

    return {
      url: previewUrl || downloadUrl,
      previewUrl: previewUrl,
      downloadUrl: downloadUrl
    };
  }

  // 1. Check for nested images array (common in some backends)
  if (obj.images?.[0]?.url) return { url: obj.images[0].url };
  if (obj.images?.[0]?.data) return { base64: obj.images[0].data };

  // 2. Check for standard URL fields
  const urlFields = ['url', 'webContentLink', 'webViewLink', 'link', 'href', 'downloadUrl', 'previewUrl', 'contentUrl', 'file', 'attachment'];
  for (const field of urlFields) {
    if (typeof obj[field] === 'string' && obj[field].startsWith('http')) {
      return { url: obj[field] };
    }
  }

  // 3. Check for standard Base64/Data fields
  const dataFields = ['data', 'base64', 'content', 'pdfBase64', 'fileContent', 'image_data', 'binary', 'output', 'body'];
  for (const field of dataFields) {
    if (typeof obj[field] === 'string' && (obj[field].length > 100 || obj[field].includes(';base64,'))) {
      return { base64: obj[field] };
    }
  }

  // 4. If it's a blob-like helper from our own postJson
  if (obj.pdfBlob) return { blob: obj.pdfBlob };

  return {};
}



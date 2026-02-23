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

/**
 * Logs the start of a generation in the database
 */
export async function logGenerationStart(childName: string, themeId: string, themeName: string) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('book_generations')
    .insert({
      child_name: childName,
      theme_id: themeId,
      theme_name: themeName,
      user_id: user?.id || null,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to log generation start:', error);
    return null;
  }

  console.log('📝 Generation logged in DB:', data.id);
  return data.id as string;
}

/**
 * Updates the status of a generation in the database
 */
export async function updateGenerationStatus(id: string, status: 'completed' | 'failed') {
  const { error } = await supabase
    .from('book_generations')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('❌ Failed to update generation status:', error);
  }
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

  const N8N_WEBHOOK_URL = "https://wonderwrapslb.app.n8n.cloud/webhook-test/2b7a5bec-96be-4571-8c7c-aaec8d0934fc";

  console.log('🚀 Sending book request directly to n8n cloud');

  let data: any;

  try {
    // Primary: Call n8n webhook directly
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ n8n direct call failed (${response.status}):`, errorText);
      throw new Error(`n8n returned status ${response.status}`);
    }

    data = await response.json();
    console.log('📦 Received response directly from n8n:', data);
  } catch (directError) {
    console.warn('⚠️ Direct n8n call failed, falling back to edge function...', directError);

    // Fallback: Try through Supabase Edge Function
    const { data: edgeData, error } = await supabase.functions.invoke('generate-book', {
      body: payload,
    });

    if (error) {
      console.error('❌ Edge function fallback also failed:', error);
      throw new Error(error.message || 'Book generation service error');
    }

    data = edgeData;
    console.log('📦 Received response from edge function fallback:', data);
  }

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
    console.log('📦 Raw items:', JSON.stringify(items.map((i: any) => ({
      name: i.name,
      mimeType: i.mimeType,
      id: i.id,
      hasThumbnail: i.hasThumbnail,
      thumbnailLink: i.thumbnailLink,
      webViewLink: i.webViewLink,
      webContentLink: i.webContentLink,
      shared: i.shared
    })), null, 2));

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

    console.log('🖼️ Cover item found:', coverItem ? { name: coverItem.name, mimeType: coverItem.mimeType, id: coverItem.id, thumbnailLink: coverItem.thumbnailLink, shared: coverItem.shared } : 'NONE');

    const pdfData = extractFileData(pdfItem || (pdfItem === undefined ? items.find((i: any) => extractFileData(i).url || extractFileData(i).base64) : null));
    const coverData = extractFileData(coverItem);

    console.log('🖼️ Cover data extracted:', JSON.stringify(coverData));

    if (pdfData.url || pdfData.base64 || pdfData.blob) {
      console.log('🎉 Successfully extracted final data from items');
      onProgress?.(100);

      let pdfBlob = pdfData.blob;
      if (pdfData.base64 && !pdfBlob) {
        pdfBlob = base64ToBlob(pdfData.base64, 'application/pdf');
      }

      // Determine best cover image URL with multiple fallback strategies
      let coverImageUrl = coverData.previewUrl || coverData.url;

      if (!coverImageUrl && coverData.base64) {
        coverImageUrl = `data:image/jpeg;base64,${coverData.base64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
      }

      // If we have a Google Drive cover item, try multiple URL strategies
      if (coverItem?.id && coverItem?.kind === 'drive#file') {
        const driveId = coverItem.id;
        // Strategy priority for Google Drive images:
        // 1. Signed thumbnail link from API (best but may expire)
        // 2. Direct export URL
        // 3. Thumbnail endpoint (requires public sharing)
        const candidateUrls = [
          coverItem.thumbnailLink?.replace(/=s\d+$/, '=s1000'),
          `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
          `https://lh3.googleusercontent.com/d/${driveId}=s1000`,
          coverItem.webContentLink,
        ].filter(Boolean);

        console.log('🖼️ Cover image URL candidates:', candidateUrls);
        coverImageUrl = candidateUrls[0] || coverImageUrl;
      }

      const result = {
        pdfUrl: pdfData.previewUrl || pdfData.url,
        pdfBlob: pdfBlob,
        coverImageUrl,
        pdfDownloadUrl: pdfData.downloadUrl || pdfData.url,
        coverDownloadUrl: coverData.downloadUrl || coverData.url
      };

      console.log('✨ Final extracted file data:', {
        hasPdf: !!result.pdfUrl || !!result.pdfBlob,
        hasCover: !!result.coverImageUrl,
        pdfUrl: result.pdfUrl?.substring(0, 80),
        coverUrl: result.coverImageUrl?.substring(0, 120),
        pdfDownloadUrl: result.pdfDownloadUrl?.substring(0, 80),
        coverDownloadUrl: result.coverDownloadUrl?.substring(0, 80)
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

    // Special handling for images: use the signed thumbnailLink from the API response
    // (files may not be publicly shared, so constructed URLs won't work)
    if (obj.mimeType?.startsWith('image/')) {
      if (obj.thumbnailLink) {
        // Use the signed thumbnail link at a larger size
        previewUrl = obj.thumbnailLink.replace(/=s\d+$/, '=s1000');
      } else {
        // Fallback: try the public thumbnail endpoint (only works if file is shared)
        previewUrl = `https://drive.google.com/thumbnail?id=${obj.id}&sz=w1000`;
      }
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



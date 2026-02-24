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
  onProgress?.(15);

  const payload = {
    childName: childName.trim(),
    themeId: theme.id,
    themeName: theme.name,
    photoBase64,
    photoMime: photoFile.type || 'image/jpeg',
  };

  const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://wonderwrapslb.app.n8n.cloud/webhook/2b7a5bec-96be-4571-8c7c-aaec8d0934fc";

  console.log('🚀 [GENERATOR] Sending DIRECT request to n8n (Live Webhook)...');
  onProgress?.(25);

  let data: any;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

    // STRICTLY ONE REQUEST: No retries, no fallback.
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`❌ [N8N] HTTP ${response.status}:`, errorText);
      throw new Error(`Magic Server Error (${response.status}). Please check your n8n workflow.`);
    }

    const contentType = response.headers.get('Content-Type');

    // Handle direct PDF response
    if (contentType === 'application/pdf' || contentType?.includes('application/pdf')) {
      console.log('📄 [N8N] Received direct PDF binary response');
      const blob = await response.blob();
      return { pdfBlob: blob };
    }

    const rawResponse = await response.text();
    console.log('📥 [N8N] Raw response received (first 200 chars):', rawResponse.substring(0, 200));

    try {
      const parsed = JSON.parse(rawResponse);
      // n8n sometimes wraps the response in an array
      data = Array.isArray(parsed) ? (parsed[0]?.body || parsed[0] || parsed) : (parsed.body || parsed);
    } catch (e) {
      // If it looks like a PDF binary but didn't have the right header
      if (rawResponse.startsWith('%PDF')) {
        console.log('📄 [N8N] Detected direct PDF binary response (via text fallback)');
        const bytes = new Uint8Array(rawResponse.length);
        for (let i = 0; i < rawResponse.length; i++) {
          bytes[i] = rawResponse.charCodeAt(i) & 0xff;
        }
        return { pdfBlob: new Blob([bytes], { type: 'application/pdf' }) };
      }
      throw new Error('Received an unreadable response from the magic server.');
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('The magic is taking a bit too long. Please try again later.');
    }
    console.error('🛑 [GENERATOR] Fatal error during direct n8n call:', err);
    throw err;
  }

  // 1. Check for jobId or statusUrl indicating a long-running process
  const isProcessing = data && (
    ['queued', 'running', 'processing', 'pending', 'waiting', 'started'].includes(data.status?.toLowerCase()) ||
    data.jobId ||
    data.statusUrl ||
    (data.message?.toLowerCase().includes('started') && !data.pdfUrl && !data.pdfBase64)
  );

  if (isProcessing) {
    console.log('⏳ [POLL] Long task detected. Entering polling mode...');
    onProgress?.(40);
    return pollGenerationStatus(data.statusUrl || data.jobId || data.id, onProgress);
  }

  // 2. Direct PDF Blob
  if (data instanceof Blob) {
    onProgress?.(100);
    return { pdfBlob: data };
  }

  const start: GenerationStartResponse = data;
  if (start && start.pdfBlob) {
    onProgress?.(100);
    return { pdfBlob: start.pdfBlob };
  }

  // 3. Array or Object with files (common in multi-upload responses)
  const s = start as any;
  const items = Array.isArray(start) ? start : (s?.files || s?.items || (s?.result && Array.isArray(s.result) ? s.result : null));

  if (items && Array.isArray(items)) {
    console.log(`📦 [N8N] Found ${items.length} items in response`);
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

    const pdfData = extractFileData(pdfItem || (pdfItem === undefined ? items.find((i: any) => {
      const extracted = extractFileData(i);
      return (extracted.url?.toLowerCase().endsWith('.pdf')) ||
        (extracted.base64?.startsWith('data:application/pdf')) ||
        (extracted.blob?.type === 'application/pdf');
    }) : null));
    const coverData = extractFileData(coverItem);

    if (pdfData.url || pdfData.base64 || pdfData.blob) {
      onProgress?.(100);

      let pdfBlob = pdfData.blob;
      if (pdfData.base64 && !pdfBlob) {
        pdfBlob = base64ToBlob(pdfData.base64, 'application/pdf');
      }

      let coverImageUrl = coverData.previewUrl || coverData.url;
      if (!coverImageUrl && coverData.base64) {
        coverImageUrl = `data:image/jpeg;base64,${coverData.base64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
      }

      if (coverItem?.id && coverItem?.kind === 'drive#file') {
        const driveId = coverItem.id;
        coverImageUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
      }

      return {
        pdfUrl: pdfData.previewUrl || pdfData.url,
        pdfBlob: pdfBlob,
        coverImageUrl,
        pdfDownloadUrl: pdfData.downloadUrl || pdfData.url,
        coverDownloadUrl: coverData.downloadUrl || coverData.url
      };
    }
  }

  // 4. Standalone fields (pdfUrl, pdfBase64, etc.)
  const pdfUrl = s?.pdfUrl || s?.pdf_url || s?.url || (typeof start === 'string' && (start as string).startsWith('http') ? start : undefined);
  const pdfBase64 = s?.pdfBase64 || s?.pdf_base64 || s?.pdf_data || s?.data || (typeof start === 'string' && (start as string).length > 1000 ? start : undefined);
  let coverImageUrl = s?.coverImageUrl || s?.cover_url || s?.thumbnailUrl || s?.image_url;

  if (s?.coverImageBase64 || s?.cover_base64 || s?.image_data) {
    const b64 = s?.coverImageBase64 || s?.cover_base64 || s?.image_data;
    coverImageUrl = `data:image/jpeg;base64,${b64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
  }

  if (pdfBase64 || pdfUrl) {
    onProgress?.(90);
    if (pdfBase64) {
      const pdfBlob = base64ToBlob(pdfBase64 as string, 'application/pdf');
      onProgress?.(100);
      return { pdfBlob, coverImageUrl };
    }
    onProgress?.(100);
    return { pdfUrl, coverImageUrl: coverImageUrl as string };
  }

  console.error('🛑 [N8N] Could not extract PDF from response:', data);
  throw new Error('Your book was created, but we had trouble retrieving the file. Please check your history in a few moments.');
}

/**
 * Polls the status of a long-running generation
 */
async function pollGenerationStatus(
  statusUrlOrId: string,
  onProgress?: (p: number) => void
): Promise<{
  pdfBlob?: Blob;
  pdfUrl?: string;
  coverImageUrl?: string;
  pdfDownloadUrl?: string;
  coverDownloadUrl?: string;
}> {
  const maxAttempts = 60; // 10 minutes (10s intervals)
  let attempts = 0;

  // Determine the status URL
  let statusUrl = statusUrlOrId;
  if (!statusUrlOrId.startsWith('http')) {
    // If only an ID was provided, we assume it's part of the n8n status endpoint
    // This depends on the n8n implementation.
    statusUrl = `https://wonderwrapslb.app.n8n.cloud/webhook/status/${statusUrlOrId}`;
  }

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔍 Polling status (Attempt ${attempts}/${maxAttempts})...`);

    try {
      const resp = await fetch(statusUrl);
      if (resp.ok) {
        const data = await resp.json();
        const status: GenerationStatusResponse = Array.isArray(data) ? data[0] : data;

        if (status.progress) {
          onProgress?.(20 + (status.progress * 0.7)); // Scale progress to 20-90% range
        }

        if (status.status === 'completed') {
          console.log('✅ Polling complete! Extracting data...');
          // Reuse the extraction logic from startGenerationViaWebhook by calling it with the final data
          // But since we are already in a loop, let's just return what we have

          let pdfBlob: Blob | undefined;
          if (status.pdfBase64) {
            pdfBlob = base64ToBlob(status.pdfBase64, 'application/pdf');
          }

          let coverImageUrl = status.coverImageUrl;
          if (status.coverImageBase64) {
            coverImageUrl = `data:image/jpeg;base64,${status.coverImageBase64}`;
          }

          onProgress?.(100);
          return {
            pdfUrl: status.pdfUrl,
            pdfBlob,
            coverImageUrl,
            pdfDownloadUrl: status.pdfUrl,
            coverDownloadUrl: coverImageUrl
          };
        }

        if (status.status === 'failed') {
          throw new Error(status.message || 'Generation failed on the server.');
        }
      }
    } catch (e) {
      console.warn('⚠️ Polling attempt failed:', e);
    }

    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error('Generation timed out after 10 minutes. Please check your magical library later.');
}

function base64ToBlob(base64: string, mime: string) {
  try {
    const actualBase64 = base64.includes(',') ? base64.split(',')[1] : base64.trim();
    const byteChars = atob(actualBase64);
    const byteNumbers = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: mime });
  } catch (e) {
    console.error('❌ Failed to convert base64 to blob:', e);
    throw new Error('Failed to process the book file. The data might be corrupted.');
  }
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



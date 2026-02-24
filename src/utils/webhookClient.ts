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

  console.log('🚀 [GENERATOR] Sending request to Edge Function...');
  onProgress?.(25);

  let data: any;
  try {
    // We use the Edge Function as the primary path to avoid browser CORS and timeout issues
    const { data: edgeData, error } = await supabase.functions.invoke('generate-book', {
      body: payload,
    });

    if (error) {
      console.error('❌ [EDGE] Generation failed:', error);
      throw new Error(error.message || 'The magic service is currently unavailable.');
    }

    data = edgeData;
    console.log('📦 [EDGE] Data received:', data);
  } catch (err: any) {
    console.error('🛑 [GENERATOR] Fatal error during generation:', err);
    throw err;
  }

  onProgress?.(100);

  // 1. Handle Direct PDF Blob
  if (data instanceof Blob) {
    return { pdfBlob: data };
  }

  // 2. Handle JSON response with URLs or Base64
  const s = Array.isArray(data) ? data[0] : data;
  
  if (s.pdfBase64 || s.pdf_base64) {
    const pdfBlob = base64ToBlob(s.pdfBase64 || s.pdf_base64, 'application/pdf');
    return { 
      pdfBlob, 
      coverImageUrl: s.coverImageUrl || s.thumbnailUrl || s.image_url 
    };
  }

  return {
    pdfUrl: s.pdfUrl || s.url || s.pdf_url,
    coverImageUrl: s.coverImageUrl || s.thumbnailUrl || s.image_url,
    pdfDownloadUrl: s.pdfUrl || s.url || s.pdf_url,
    coverDownloadUrl: s.coverImageUrl || s.image_url
  };
}

/**
 * Watches the Supabase database for the result, avoiding browser timeouts
 */
async function pollDatabaseStatus(
  generationId: string,
  onProgress?: (p: number) => void
): Promise<any> {
  const maxAttempts = 180; // 30 minutes (10s intervals)
  let attempts = 0;

  console.log(`📡 [WATCHER] Monitoring Database for ID: ${generationId}`);

  while (attempts < maxAttempts) {
    attempts++;
    
    // Slowly simulate progress if we don't have real progress data
    if (attempts < 100) {
      onProgress?.(20 + (attempts * 0.5)); 
    }

    try {
      const { data, error } = await supabase
        .from('book_generations')
        .select('*')
        .eq('id', generationId)
        .single();

      if (error) throw error;

      if (data.status && data.status.startsWith('completed:')) {
        const pdfUrl = data.status.replace('completed:', '').trim();
        console.log('✅ [WATCHER] Book found! PDF URL:', pdfUrl);
        onProgress?.(100);
        return {
          pdfUrl: pdfUrl,
          pdfDownloadUrl: pdfUrl,
        };
      }

      if (data.status === 'failed') {
        throw new Error(data.error_message || 'The AI magic encountered an issue.');
      }

    } catch (e) {
      console.warn('⚠️ [WATCHER] DB check failed, retrying...', e);
    }

    // Wait 10 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error('The magic is taking longer than 30 minutes. Please check your library later.');
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
  const maxAttempts = 180; // 30 minutes (10s intervals)
  let attempts = 0;

  // Update this to your LIVE production status webhook URL
  let statusUrl = statusUrlOrId;
  if (!statusUrlOrId.startsWith('http')) {
    statusUrl = `https://wonderwrapslb.app.n8n.cloud/webhook/2b7a5bec-96be-4571-8c7c-aaec8d0934fc/status?jobId=${statusUrlOrId}`;
  }

  console.log('🔍 [POLL] Starting status checks at:', statusUrl);

  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔍 Polling status (Attempt ${attempts}/${maxAttempts})...`);

    try {
      const resp = await fetch(statusUrl);
      if (resp.ok) {
        const data = await resp.json();
        const status: GenerationStatusResponse = Array.isArray(data) ? data[0] : data;

        if (status.progress !== undefined) {
          // Scale from 25% (starting point of request) to 95%
          const scaledProgress = 25 + (status.progress * 0.7);
          onProgress?.(Math.min(95, Math.round(scaledProgress)));
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

  throw new Error('Generation timed out after 30 minutes. Please check your magical library later.');
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



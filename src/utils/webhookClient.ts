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

  // 1. Log the start in DB
  const generationId = await logGenerationStart(childName.trim(), theme.id, theme.name);
  if (!generationId) throw new Error("Failed to initialize generation in database.");

  const payload = {
    generationId,
    childName: childName.trim(),
    themeId: theme.id,
    themeName: theme.name,
    photoBase64,
    photoMime: photoFile.type || 'image/jpeg',
  };

  const N8N_WEBHOOK_URL = "https://wonderwrapslb.app.n8n.cloud/webhook/2b7a5bec-96be-4571-8c7c-aaec8d0934fc";

  console.log('🚀 [GENERATOR] Calling n8n and monitoring DB status...');
  onProgress?.(20);

  // 2. Start the n8n request and the DB watcher in parallel
  // We use Promise.race or similar logic to handle the results
  const n8nRequest = async () => {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Magic Server Error (${response.status})`);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType?.includes('application/pdf')) {
      const blob = await response.blob();
      return { pdfBlob: blob };
    }

    const data = await response.json();
    const s = Array.isArray(data) ? data[0] : data;
    
    // Support the various response shapes n8n might send
    return {
      pdfUrl: s.pdfUrl || s.url || s.pdf_url,
      coverImageUrl: s.coverImageUrl || s.thumbnailUrl || s.image_url,
      pdfDownloadUrl: s.pdfUrl || s.url || s.pdf_url,
      coverDownloadUrl: s.coverImageUrl || s.image_url
    };
  };

  const dbWatcher = async () => {
    const maxAttempts = 120; // 20 minutes
    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
      const { data } = await supabase.from('book_generations').select('status').eq('id', generationId).single();
      
      if (data?.status === 'completed') {
        console.log('✅ [WATCHER] DB shows completed. Finalizing...');
        onProgress?.(95);
        return 'done';
      }
      if (data?.status === 'failed') throw new Error('Generation failed according to database.');
      
      await new Promise(r => setTimeout(r, 10000)); // Check every 10s
    }
    throw new Error('Timeout waiting for database update.');
  };

  // We wait for the n8n request primarily, but use the DB watcher to keep the UI alive
  try {
    const result = await Promise.race([
      n8nRequest(),
      dbWatcher().then(() => new Promise(r => setTimeout(r, 30000))) // Give n8n extra time to finish after DB update
    ]);

    if (result === undefined || typeof result === 'string') {
      // If the watcher finished but the request didn't return data yet, 
      // we try one last time to wait for the n8n request specifically
      return await n8nRequest();
    }

    onProgress?.(100);
    return result;
  } catch (err: any) {
    console.error('🛑 [GENERATOR] Error:', err);
    throw err;
  }
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



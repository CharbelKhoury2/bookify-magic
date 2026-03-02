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
export async function logGenerationStart(
  childName: string,
  themeId: string,
  themeName: string
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('book_generations')
      .insert({
        child_name: childName,
        theme_id: themeId,
        theme_name: themeName,
        user_id: user?.id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log('📝 Generation logged in DB:', data?.id);
    return data?.id || null;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Failed to log generation start:', err);
    return null;
  }
}

/**
 * Updates the status of a generation in the database
 */
export async function updateGenerationStatus(generationId: string, status: 'pending' | 'completed' | 'failed') {
  try {
    const { error } = await supabase
      .from('book_generations')
      .update({ status })
      .eq('id', generationId);

    if (error) throw error;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Failed to update generation status:', err);
  }
}

export async function startGenerationViaWebhook(
  childName: string,
  theme: Theme,
  photoFile: File,
  generationId: string,
  onProgress?: (p: number) => void,
  preProcessedPhotoBase64?: string
): Promise<{
  pdfBlob?: Blob;
  pdfUrl?: string;
  coverImageUrl?: string;
  pdfDownloadUrl?: string;
  coverDownloadUrl?: string;
}> {
  onProgress?.(5);
  // Use pre-processed photo if available, otherwise process the file
  const photoBase64 = preProcessedPhotoBase64 || await imageToBase64(photoFile);
  onProgress?.(15);

  const payload = {
    generationId,
    childName: childName.trim(),
    themeId: theme.id,
    themeName: theme.name,
    photoBase64,
    photoMime: photoFile.type || 'image/jpeg',
  };

  console.log(`🚀 [GENERATOR] Triggering Supabase Edge Function... (ID: ${generationId})`);
  onProgress?.(25);

  try {
    // 2. Trigger the Edge Function
    const { data: triggerData, error: triggerError } = await supabase.functions.invoke<{ status: string }>('generate-book', {
      body: payload
    });

    if (triggerError) {
      console.error('🛑 [GENERATOR] Edge Function Error:', triggerError);
      const errorMsg = triggerError.message || 'Server error';
      throw new Error(`Failed to start generation: ${errorMsg}`);
    }

    console.log(`📡 [GENERATOR] Magic started successfully. Monitoring database...`);
    onProgress?.(30);

    // 3. Start Polling the DATABASE using the specific generationId
    return monitorLibraryForResultById(generationId, onProgress);

  } catch (err: unknown) {
    const error = err as Error;
    console.error('🛑 [GENERATOR] Fatal Error:', error);
    throw error;
  }
}

/**
 * Monitors a specific database record for completion
 */
async function monitorLibraryForResultById(
  generationId: string,
  onProgress?: (p: number) => void
): Promise<{
  pdfUrl: string;
  coverImageUrl: string | null;
  pdfDownloadUrl: string;
  coverDownloadUrl: string | null;
  childName?: string;
  themeName?: string;
  themeEmoji?: string;
} | null> {
  const maxAttempts = 180; // 30 minutes (10s intervals)
  let attempts = 0;

  console.log(`📡 [WATCHER] Monitoring Database for ID: ${generationId}`);

  while (attempts < maxAttempts) {
    attempts++;

    // Artificial progress to keep the user excited (scales from 30% to 95%)
    if (attempts < 100) {
      onProgress?.(Math.min(95, 30 + (attempts * 0.6)));
    }

    try {
      const { data: book, error } = await supabase
        .from('book_generations')
        .select('*')
        .eq('id', generationId)
        .single();

      if (!error && book) {
        // If n8n has updated the status to completed
        if (book.status === 'completed' || (book as { pdf_url?: string; generated_pdf_url?: string }).pdf_url || (book as { pdf_url?: string; generated_pdf_url?: string }).generated_pdf_url) {
          console.log('✅ [WATCHER] Magic complete! Opening book...');

          const pdfUrl = (book as { pdf_url?: string; generated_pdf_url?: string }).pdf_url || (book as { pdf_url?: string; generated_pdf_url?: string }).generated_pdf_url || '';
          const coverUrl = (book as { thumbnail_url?: string; cover_image_url?: string; cover_url?: string; featured_image?: string }).thumbnail_url || 
                           (book as { thumbnail_url?: string; cover_image_url?: string; cover_url?: string; featured_image?: string }).cover_image_url || 
                           (book as { thumbnail_url?: string; cover_image_url?: string; cover_url?: string; featured_image?: string }).cover_url || 
                           (book as { thumbnail_url?: string; cover_image_url?: string; cover_url?: string; featured_image?: string }).featured_image || '';

          // Google Drive Security Fix: Convert /view to /preview for embeddable preview
          if (pdfUrl.includes('drive.google.com') && pdfUrl.includes('/view')) {
            pdfUrl = pdfUrl.replace('/view', '/preview');
          }

          // If we have a cover URL, ensure it's a good one
          if (coverUrl.includes('drive.google.com') && coverUrl.includes('/view')) {
            coverUrl = coverUrl.replace('/view', '/preview');
          }

          onProgress?.(100);
          return {
            pdfUrl: pdfUrl,
            coverImageUrl: coverUrl || null,
            pdfDownloadUrl: (book as { pdf_url?: string; generated_pdf_url?: string }).pdf_url || (book as { pdf_url?: string; generated_pdf_url?: string }).generated_pdf_url || '',
            coverDownloadUrl: (book as { thumbnail_url?: string; cover_image_url?: string; cover_url?: string }).thumbnail_url || (book as { thumbnail_url?: string; cover_image_url?: string; cover_url?: string }).cover_image_url || (book as { thumbnail_url?: string; cover_image_url?: string; cover_url?: string }).cover_url || '',
            childName: book.child_name,
            themeName: book.theme_name,
            themeEmoji: (book as any).theme_emoji || '📚',
          };
        }

        if (book.status === 'failed') {
          throw new Error(book.error_message || 'The magic encountered a little breeze! Please try generating your story again. 🪄');
        }
      }
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('little breeze')) throw error;
      console.warn('🔍 [WATCHER] DB check failed, retrying...', error);
    }

    await new Promise(r => setTimeout(r, 10000)); // Wait 10s between checks
  }

  throw new Error('The magical ink is taking a bit longer than usual to dry. 🎨 Your story is still being crafted! Please check "My Library" in a few minutes.');
}

/**
 * Publicly exposed version of monitorLibraryForResultById for resuming state after refresh
 */
export async function resumeGenerationMonitoring(
  generationId: string,
  onProgress?: (p: number) => void
): Promise<{
  pdfBlob?: Blob;
  pdfUrl?: string;
  coverImageUrl?: string;
  pdfDownloadUrl?: string;
  coverDownloadUrl?: string;
  childName?: string;
  themeName?: string;
  themeEmoji?: string;
} | null> {
  return monitorLibraryForResultById(generationId, onProgress);
}

/**
 * Polls the n8n Public API for execution status and extracts results from runData
 */
async function pollN8nExecution(
  executionId: string,
  url: string,
  apiKey: string,
  onProgress?: (p: number) => void,
  isWebhook: boolean = false
): Promise<{
  pdfUrl: string;
  coverImageUrl: string;
  pdfDownloadUrl: string;
  coverDownloadUrl: string;
  allStories: string[];
  allCovers: string[];
} | null> {
  if (!apiKey && !isWebhook) {
    throw new Error("n8n API Key is missing. Please set VITE_N8N_API_KEY.");
  }

  const maxAttempts = 120; // 20 minutes (10s intervals)
  let attempts = 0;

  console.log(`🔍 [POLL] Monitoring n8n execution: ${executionId} via ${isWebhook ? 'Webhook' : 'Public API'}`);

  while (attempts < maxAttempts) {
    attempts++;

    // Artificial progress to keep user engaged (scales from 30% to 95%)
    if (attempts < 100) {
      onProgress?.(Math.min(95, 30 + (attempts * 0.6)));
    }

    try {
      console.log(`📡 [POLL] Fetching status for execution ${executionId}...`);

      let response;
      if (isWebhook) {
        // Calling a custom status webhook (CORS enabled)
        // We pass the executionId as a query param or in the body
        const statusUrl = new URL(url);
        statusUrl.searchParams.append('executionId', executionId);
        response = await fetch(statusUrl.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Calling the n8n Public API directly (usually blocked by CORS in browser)
        response = await fetch(`${url}/api/v1/executions/${executionId}`, {
          headers: { 'X-N8N-API-KEY': apiKey }
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ [POLL] API check failed (${response.status}). Body:`, errorText);
      } else {
        const data = await response.json();

        // If using a status webhook, the data might be nested differently 
        // depending on how the user configured the "n8n API" node response.
        // We try to normalize it.
        const executionData = isWebhook ? (data.data || data) : data;

        console.log(`📊 [POLL] Status: ${executionData.status}, Finished: ${executionData.finished}`);

        // Check if finished
        if (executionData.finished === true || executionData.status === 'success' || executionData.status === 'completed') {
          console.log('✅ [POLL] Execution finished! Full Data:', executionData);

          const runData = executionData.data?.resultData?.runData || executionData.resultData?.runData || {};
          const extractedStories: string[] = [];
          const extractedCovers: string[] = [];

          console.log(`📦 [POLL] Scanning ${Object.keys(runData).length} nodes for results...`);

          // Scan all nodes for the specific naming convention provided by user
          Object.keys(runData).forEach(nodeName => {
            // n8n runData path can be complex. We try a few common paths.
            // Path 1: runData[nodeName][0].data.main[0][0].json
            // Path 2: runData[nodeName][0].data.main[0].json
            const executionEntry = runData[nodeName]?.[0];
            const mainData = executionEntry?.data?.main;

            let nodeOutput = null;
            if (Array.isArray(mainData?.[0])) {
              nodeOutput = mainData[0][0]?.json;
            } else {
              nodeOutput = mainData?.[0]?.json;
            }

            if (nodeOutput) {
              const link = nodeOutput.webViewLink || nodeOutput.url || nodeOutput.fileUrl || nodeOutput.link;
              if (link) {
                if (nodeName.startsWith('Upload Story Cover')) {
                  console.log(`📸 [POLL] Found Cover in node "${nodeName}": ${link}`);
                  extractedCovers.push(link);
                } else if (nodeName.startsWith('Upload Story')) {
                  console.log(`📄 [POLL] Found Story in node "${nodeName}": ${link}`);
                  extractedStories.push(link);
                }
              }
            }
          });

          if (extractedStories.length === 0) {
            console.warn('⚠️ [POLL] Finished but no Story link found. Node names found:', Object.keys(runData));
          }

          onProgress?.(100);
          return {
            pdfUrl: extractedStories[0] || '',
            coverImageUrl: extractedCovers[0] || '',
            pdfDownloadUrl: extractedStories[0] || '',
            coverDownloadUrl: extractedCovers[0] || '',
            allStories: extractedStories,
            allCovers: extractedCovers
          };
        }

        if (data.status === 'failed' || data.status === 'error') {
          throw new Error('The AI workflow encountered an error in n8n.');
        }
      }
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message?.includes('AI workflow encountered an error')) throw error;
      console.error('🔍 [POLL] Network/API Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: (error as Error & { cause?: unknown }).cause
      });
      // If it's a persistent fetch error, we might want to inform the user
      if (attempts > 5 && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError'))) {
        console.warn('⚠️ [POLL] Multiple network errors detected. This might be a CORS issue with the n8n Public API.');
      }
    }

    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error('The wizard is working overtime! 🧙‍♂️ Your story is taking longer than expected. Please check your library in a little while.');
}

/**
 * Monitors the database for the new book to appear
 */
async function monitorLibraryForResult(
  childName: string,
  themeName: string,
  onProgress?: (p: number) => void
): Promise<{
  pdfUrl: string;
  coverImageUrl: string;
  pdfDownloadUrl: string;
} | null> {
  const maxAttempts = 120; // 20 minutes (10s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // Artificial progress to keep the user excited
    if (attempts < 100) {
      onProgress?.(Math.min(99, 25 + (attempts * 0.6)));
    }

    try {
      // Check the latest generations for this child
      const { data, error } = await supabase
        .from('book_generations')
        .select('*')
        .eq('child_name', childName)
        .eq('theme_name', themeName)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const book = data[0];

        // If n8n has updated the status to completed
        if (book.status === 'completed' || book.pdf_url || book.generated_pdf_url) {
          console.log('✅ [WATCHER] Magic complete! Opening book...');
          onProgress?.(100);
          return {
            pdfUrl: book.pdf_url || book.generated_pdf_url,
            coverImageUrl: book.thumbnail_url || book.cover_image_url,
            pdfDownloadUrl: book.pdf_url || book.generated_pdf_url,
          };
        }

        if (book.status === 'failed') {
          throw new Error('The AI encountered a hiccup. Please try again.');
        }
      }
    } catch (e) {
      console.warn('🔍 [WATCHER] Library check failed, retrying...', e);
    }

    await new Promise(r => setTimeout(r, 10000)); // Wait 10s between checks
  }

  throw new Error('The magical quill is still writing... ✍️ Your book isn\'t quite ready yet. Please peek into "My Library" in a few minutes!');
}

/**
 * Watches the Supabase database for the result, avoiding browser timeouts
 */
async function pollDatabaseStatus(
  generationId: string,
  onProgress?: (p: number) => void
): Promise<{
  pdfUrl: string;
  pdfDownloadUrl: string;
} | null> {
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

  throw new Error('Our magical owls are still delivering the pages! 🦉 Check your library later to see your completed adventure.');
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

  throw new Error('The magic portal is busy today! 🌟 Your story is still in the works. Please visit "My Library" in a few minutes.');
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
function extractFileData(obj: Record<string, unknown>): { url?: string, previewUrl?: string, downloadUrl?: string, base64?: string, blob?: Blob } {
  if (!obj) return {};

  // 1. Handle Google Drive objects specifically
  if (obj.kind === 'drive#file' || obj.webContentLink || obj.webViewLink) {
    const downloadUrl = typeof obj.webContentLink === 'string' ? obj.webContentLink : undefined;
    let previewUrl = typeof obj.webViewLink === 'string' ? obj.webViewLink : undefined;

    // Convert view link to preview link for iframes
    if (previewUrl && previewUrl.includes('/view')) {
      previewUrl = previewUrl.replace('/view', '/preview');
    }

    // Special handling for images: use the signed thumbnailLink from the API response
    if (typeof obj.mimeType === 'string' && obj.mimeType.startsWith('image/')) {
      const thumbnailLink = typeof obj.thumbnailLink === 'string' ? obj.thumbnailLink : undefined;
      if (thumbnailLink) {
        // Use the signed thumbnail link at a larger size
        previewUrl = thumbnailLink.replace(/=s\d+$/, '=s1000');
      } else if (typeof obj.id === 'string') {
        // Fallback: try the public thumbnail endpoint
        previewUrl = `https://drive.google.com/thumbnail?id=${obj.id}&sz=w1000`;
      }
    }

    return {
      url: previewUrl || downloadUrl,
      previewUrl: previewUrl,
      downloadUrl: downloadUrl
    };
  }

  // 2. Check for nested images array (common in some backends)
  const images = obj.images as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const firstImage = images[0];
    if (typeof firstImage.url === 'string') return { url: firstImage.url };
    if (typeof firstImage.data === 'string') return { base64: firstImage.data };
  }

  // 3. Check for standard URL fields
  const urlFields = ['url', 'webContentLink', 'webViewLink', 'link', 'href', 'downloadUrl', 'previewUrl', 'contentUrl', 'file', 'attachment', 'pdf_url', 'generated_pdf_url'];
  for (const field of urlFields) {
    const val = obj[field];
    if (typeof val === 'string' && val.startsWith('http')) {
      return { url: val };
    }
  }

  // 4. Check for standard Base64/Data fields
  const dataFields = ['data', 'base64', 'content', 'pdfBase64', 'fileContent', 'image_data', 'binary', 'output', 'body'];
  for (const field of dataFields) {
    const val = obj[field];
    if (typeof val === 'string' && (val.length > 100 || val.includes(';base64,'))) {
      return { base64: val };
    }
  }

  // 5. If it's a blob-like helper from our own postJson
  if (obj.pdfBlob instanceof Blob) return { blob: obj.pdfBlob };

  return {};
}



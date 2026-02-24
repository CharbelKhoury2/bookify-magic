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
  const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY;
  const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || "https://wonderwrapslb.app.n8n.cloud";

  console.log('🚀 [GENERATOR] Triggering n8n workflow...');
  onProgress?.(25);

  try {
    // 1. Trigger the workflow
    // The webhook should be configured to respond immediately with {"executionId": "..."}
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger workflow (${response.status})`);
    }

    const triggerData = await response.json();
    const executionId = triggerData.executionId || triggerData.id;

    if (!executionId) {
      console.warn('⚠️ [GENERATOR] No executionId received. n8n might not be set to respond immediately.');
      throw new Error('Server did not provide an execution ID. Please check n8n settings.');
    }

    console.log(`📡 [GENERATOR] Workflow started. Execution ID: ${executionId}`);
    onProgress?.(30);

    // 2. Start Polling the n8n Public API
    return pollN8nExecution(executionId, N8N_BASE_URL, N8N_API_KEY, onProgress);

  } catch (err: any) {
    console.error('🛑 [GENERATOR] Fatal Error:', err);
    throw err;
  }
}

/**
 * Polls the n8n Public API for execution status and extracts results from runData
 */
async function pollN8nExecution(
  executionId: string,
  baseUrl: string,
  apiKey: string,
  onProgress?: (p: number) => void
): Promise<any> {
  if (!apiKey) {
    throw new Error("n8n API Key is missing. Please set VITE_N8N_API_KEY.");
  }

  const maxAttempts = 120; // 20 minutes (10s intervals)
  let attempts = 0;

  console.log(`🔍 [POLL] Monitoring n8n execution: ${executionId}`);

  while (attempts < maxAttempts) {
    attempts++;
    
    // Artificial progress to keep user engaged (scales from 30% to 95%)
    if (attempts < 100) {
      onProgress?.(Math.min(95, 30 + (attempts * 0.6)));
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/executions/${executionId}`, {
        headers: { 'X-N8N-API-KEY': apiKey }
      });

      if (!response.ok) {
        console.warn(`⚠️ [POLL] API check failed (${response.status}). Retrying...`);
      } else {
        const data = await response.json();

        // Check if finished
        if (data.finished || data.status === 'success') {
          console.log('✅ [POLL] Execution finished! Extracting data...');
          
          const runData = data.data?.resultData?.runData || {};
          const extractedStories: string[] = [];
          const extractedCovers: string[] = [];

          // Scan all nodes for the specific naming convention provided by user
          Object.keys(runData).forEach(nodeName => {
            const nodeOutput = runData[nodeName]?.[0]?.data?.main?.[0]?.json;
            if (nodeOutput?.webViewLink || nodeOutput?.url) {
              const link = nodeOutput.webViewLink || nodeOutput.url;
              if (nodeName.startsWith('Upload Story Cover')) {
                extractedCovers.push(link);
              } else if (nodeName.startsWith('Upload Story')) {
                extractedStories.push(link);
              }
            }
          });

          if (extractedStories.length === 0) {
            console.warn('⚠️ [POLL] Finished but no Story link found in runData nodes.');
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
    } catch (e: any) {
      if (e.message?.includes('AI workflow encountered an error')) throw e;
      console.warn('🔍 [POLL] Error checking status:', e);
    }

    // Wait 10 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error('Generation timed out after 20 minutes. Please check your library later.');
}

/**
 * Monitors the database for the new book to appear
 */
async function monitorLibraryForResult(
  childName: string,
  themeName: string,
  onProgress?: (p: number) => void
): Promise<any> {
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

  throw new Error('The magic is taking longer than usual. Please check your "My Library" section in a few minutes.');
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



import { Theme } from './types';
import { imageToBase64 } from './imageProcessor';

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

async function postJson(url: string, body: any): Promise<any> {
  console.log('🚀 Sending book request to Webhook:', url);
  console.log('📦 Data being sent:', {
    ...body,
    photoBase64: body.photoBase64?.substring(0, 50) + '...'
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/pdf'
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type');
    console.log('📥 Received Response Status:', res.status, '(' + contentType + ')');

    if (res.ok && contentType?.includes('application/pdf')) {
      const blob = await res.blob();
      return { pdfBlob: blob, status: 'completed' };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ Webhook error response:', text);
      throw new Error(`Server returned error ${res.status}: ${text.slice(0, 100)}`);
    }

    const text = await res.text();
    console.log('📄 Raw response text (first 500 chars):', text.substring(0, 500));
    try {
      const parsed = JSON.parse(text);
      console.log('✅ Parsed JSON response:', parsed);
      return parsed;
    } catch {
      console.warn('⚠️ Webhook returned non-JSON text:', text);
      throw new Error(`Webhook returned text instead of JSON: "${text.slice(0, 50)}..."`);
    }
  } catch (err: any) {
    console.error('🚨 Connection Error:', err);
    if (err?.name === 'TypeError') {
      throw new Error('Network/CORS error. Please ensure n8n allows requests from this domain or use the Supabase proxy.');
    }
    throw err;
  }
}

async function getJson(url: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  try {
    const res = await fetch(url, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' && body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Status error ${res.status}: ${text.slice(0, 100)}`);
    }
    return await res.json();
  } catch (err: any) {
    throw err;
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
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;
  const statusUrlBase = import.meta.env.VITE_N8N_STATUS_URL as string | undefined;
  const statusMethod = ((import.meta.env.VITE_N8N_STATUS_METHOD as string | undefined) || 'GET').toUpperCase() as 'GET' | 'POST';

  if (!webhookUrl) {
    throw new Error('Missing VITE_N8N_WEBHOOK_URL in .env file');
  }

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

  const start: GenerationStartResponse = await postJson(webhookUrl, payload);

  // If direct PDF binary response
  if (start.pdfBlob) {
    onProgress?.(100);
    return { pdfBlob: start.pdfBlob };
  }

  // Check if response is an array (new backend format with both cover and PDF)
  if (Array.isArray(start)) {
    console.log('📦 Received array response with', start.length, 'items:', start);

    // Extract both cover image and PDF from the array
    // Cover object has 'images' array, PDF object has 'url' and 'name' ending in .pdf
    const coverObj = start.find((item: any) => item.images && Array.isArray(item.images));
    const pdfObj = start.find((item: any) => item.url && item.name && item.name.endsWith('.pdf'));

    console.log('🖼️ Cover object found:', coverObj);
    console.log('📄 PDF object found:', pdfObj);

    let coverImageUrl: string | undefined;
    let coverDownloadUrl: string | undefined;
    let pdfDownloadUrl: string | undefined;
    let pdfPreviewUrl: string | undefined;

    // Extract cover image URLs
    if (coverObj?.images?.[0]?.url) {
      coverImageUrl = coverObj.images[0].url;
      coverDownloadUrl = coverObj.images[0].url;
      console.log('✅ Cover image URL extracted:', coverImageUrl);
    } else {
      console.warn('⚠️ No cover image found in array response');
    }

    // Extract PDF URLs
    if (pdfObj?.url) {
      pdfDownloadUrl = pdfObj.url;
      pdfPreviewUrl = pdfObj.url;
      console.log('✅ PDF URL extracted:', pdfDownloadUrl);
    } else {
      console.error('❌ No PDF object found in array response');
      throw new Error('Backend returned array but no PDF file was found');
    }

    // Log final extracted data
    console.log('🎉 Successfully extracted both files:', {
      coverImageUrl,
      coverDownloadUrl,
      pdfPreviewUrl,
      pdfDownloadUrl,
      hasCover: !!coverImageUrl,
      hasPDF: !!pdfDownloadUrl
    });

    onProgress?.(100);
    return {
      pdfUrl: pdfPreviewUrl,
      coverImageUrl,
      pdfDownloadUrl,
      coverDownloadUrl
    };
  }

  // If synchronous response with URLs or Base64 (old format)
  if (start.pdfBase64 || start.pdfUrl) {
    onProgress?.(90);
    let coverImageUrl = start.coverImageUrl;
    if (start.coverImageBase64) {
      coverImageUrl = `data:image/jpeg;base64,${start.coverImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
    }

    if (start.pdfBase64) {
      const pdfBlob = base64ToBlob(start.pdfBase64, 'application/pdf');
      onProgress?.(100);
      return { pdfBlob, coverImageUrl };
    }
    onProgress?.(100);
    return { pdfUrl: start.pdfUrl, coverImageUrl };
  }

  // Polling logic
  const jobId = start.jobId;
  const statusUrl = start.statusUrl || (statusUrlBase && jobId ? `${statusUrlBase.replace(/\/$/, '')}/${jobId}` : undefined);

  if (!statusUrl) {
    throw new Error('Generation started, but no status URL provided by n8n.');
  }

  let progressShown = 15;
  const startTime = Date.now();
  const maxWaitMs = 5 * 60 * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const status: GenerationStatusResponse = await getJson(
      statusUrl,
      statusMethod,
      statusMethod === 'POST' ? { jobId } : undefined
    );

    if (status.progress !== undefined) {
      onProgress?.(Math.min(99, Math.max(progressShown, status.progress)));
    } else {
      progressShown = Math.min(95, progressShown + 3);
      onProgress?.(progressShown);
    }

    if (status.status === 'completed') {
      let coverImageUrl = status.coverImageUrl;
      if (status.coverImageBase64) {
        coverImageUrl = `data:image/jpeg;base64,${status.coverImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
      }

      if (status.pdfBase64) {
        const pdfBlob = base64ToBlob(status.pdfBase64, 'application/pdf');
        onProgress?.(100);
        return { pdfBlob, coverImageUrl };
      }
      onProgress?.(100);
      return { pdfUrl: status.pdfUrl, coverImageUrl };
    }

    if (status.status === 'failed') {
      throw new Error(status.message || 'Generation failed in n8n');
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error('Generation timed out after 5 minutes');
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

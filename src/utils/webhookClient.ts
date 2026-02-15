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
      console.log('ℹ️ Webhook returned raw text, checking if it is a URL or Base64');
      // If it's a URL or base64, return it in a format the caller can use
      if (text.trim().startsWith('http')) return { pdfUrl: text.trim() };
      if (text.length > 500) return { pdfBase64: text.trim() };

      throw new Error(`Webhook returned unparseable text: "${text.slice(0, 100)}..."`);
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

      return {
        pdfUrl: pdfData.previewUrl || pdfData.url,
        pdfBlob: pdfBlob,
        coverImageUrl: coverData.previewUrl || coverData.url || (coverData.base64 ? `data:image/jpeg;base64,${coverData.base64.replace(/^data:image\/[a-z]+;base64,/, '')}` : undefined),
        pdfDownloadUrl: pdfData.downloadUrl || pdfData.url,
        coverDownloadUrl: coverData.downloadUrl || coverData.url
      };
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
  const urlFields = ['url', 'webContentLink', 'webViewLink', 'link', 'href', 'downloadUrl', 'previewUrl', 'contentUrl'];
  for (const field of urlFields) {
    if (typeof obj[field] === 'string' && obj[field].startsWith('http')) {
      return { url: obj[field] };
    }
  }

  // 3. Check for standard Base64/Data fields
  const dataFields = ['data', 'base64', 'content', 'pdfBase64', 'fileContent', 'image_data', 'binary'];
  for (const field of dataFields) {
    if (typeof obj[field] === 'string' && (obj[field].length > 100 || obj[field].includes(';base64,'))) {
      return { base64: obj[field] };
    }
  }

  // 4. If it's a blob-like helper from our own postJson
  if (obj.pdfBlob) return { blob: obj.pdfBlob };

  return {};
}



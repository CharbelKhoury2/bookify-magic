import { Theme } from './types';
import { imageToBase64 } from './imageProcessor';

export interface GenerationStartResponse {
  status?: string;
  jobId?: string;
  statusUrl?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  pdfBlob?: Blob;
  message?: string;
}

export interface GenerationStatusResponse {
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  pdfUrl?: string;
  pdfBase64?: string;
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
    try {
      return JSON.parse(text);
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
): Promise<{ pdfBlob?: Blob; pdfUrl?: string }> {
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

  if (start.pdfBlob) {
    onProgress?.(100);
    return { pdfBlob: start.pdfBlob };
  }

  if (start.pdfBase64 || start.pdfUrl) {
    onProgress?.(90);
    if (start.pdfBase64) {
      const pdfBlob = base64ToBlob(start.pdfBase64, 'application/pdf');
      onProgress?.(100);
      return { pdfBlob };
    }
    onProgress?.(100);
    return { pdfUrl: start.pdfUrl };
  }

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
      if (status.pdfBase64) {
        const pdfBlob = base64ToBlob(status.pdfBase64, 'application/pdf');
        onProgress?.(100);
        return { pdfBlob };
      }
      onProgress?.(100);
      return { pdfUrl: status.pdfUrl };
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

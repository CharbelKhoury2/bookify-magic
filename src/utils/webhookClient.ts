import { Theme } from './types';
import { imageToBase64 } from './imageProcessor';

export interface GenerationStartResponse {
  status?: string;
  jobId?: string;
  statusUrl?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  message?: string;
}

export interface GenerationStatusResponse {
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number; // 0-100 if provided by n8n
  pdfUrl?: string;
  pdfBase64?: string;
  message?: string;
}

async function postJson(url: string, body: any) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Webhook error ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
    }
    try {
      return await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      throw new Error(`Webhook returned non-JSON response${text ? `: ${text.slice(0, 200)}` : ''}`);
    }
  } catch (err: any) {
    if (err?.name === 'TypeError') {
      throw new Error('Network or CORS error contacting webhook');
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
      throw new Error(`Status error ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
    }
    try {
      return await res.json();
    } catch {
      const text = await res.text().catch(() => '');
      throw new Error(`Status endpoint returned non-JSON response${text ? `: ${text.slice(0, 200)}` : ''}`);
    }
  } catch (err: any) {
    if (err?.name === 'TypeError') {
      throw new Error('Network or CORS error contacting status endpoint');
    }
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
  const statusUrlBase = import.meta.env.VITE_N8N_STATUS_URL as string | undefined; // e.g. https://n8n.example.com/webhook/status/:jobId
  const statusMethod = ((import.meta.env.VITE_N8N_STATUS_METHOD as string | undefined) || 'GET').toUpperCase() as 'GET' | 'POST';

  if (!webhookUrl) {
    throw new Error('Missing VITE_N8N_WEBHOOK_URL env var');
  }

  onProgress?.(5);
  const photoBase64 = await imageToBase64(photoFile);
  onProgress?.(10);

  const payload = {
    childName,
    themeId: theme.id,
    themeName: theme.name,
    photoBase64,
    photoMime:
      photoFile.type ||
      (photoBase64.match(/^data:([^;]+);/)?.[1] ?? 'application/octet-stream'),
  };

  const start: GenerationStartResponse = await postJson(webhookUrl, payload);

  // If synchronous result
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

  // Otherwise poll for status
  const jobId = start.jobId;
  const statusUrl = start.statusUrl || (statusUrlBase && jobId ? `${statusUrlBase.replace(/\/$/, '')}/${jobId}` : undefined);
  if (!statusUrl) {
    throw new Error('Webhook did not return statusUrl or jobId; cannot poll.');
  }

  let progressShown = 15;
  onProgress?.(progressShown);

  const maxWaitMs = 5 * 60 * 1000; // 5 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status: GenerationStatusResponse = await getJson(
      statusUrl,
      statusMethod,
      statusMethod === 'POST' ? { jobId } : undefined
    );

    if (status.progress !== undefined) {
      onProgress?.(Math.min(99, Math.max(progressShown, status.progress)));
    } else {
      // make gentle progress if no explicit progress
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
      throw new Error(status.message || 'Generation failed');
    }

    await delay(2000);
  }

  throw new Error('Generation timed out');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function base64ToBlob(base64: string, mime: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
}

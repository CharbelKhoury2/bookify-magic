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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Webhook error ${res.status}`);
  }
  return res.json();
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Status error ${res.status}`);
  }
  return res.json();
}

export async function startGenerationViaWebhook(
  childName: string,
  theme: Theme,
  photoFile: File,
  onProgress?: (p: number) => void
): Promise<{ pdfBlob?: Blob; pdfUrl?: string }> {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;
  const statusUrlBase = import.meta.env.VITE_N8N_STATUS_URL as string | undefined; // e.g. https://n8n.example.com/webhook/status/:jobId

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
    const status: GenerationStatusResponse = await getJson(statusUrl);

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
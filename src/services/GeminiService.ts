import { bffFetch } from './BFFClient';

export interface GeneratedCopyResult {
  hook: string;
  body: string;
  cta: string;
  tags: string[];
  fullText: string;
}

export interface VideoGenerationResult {
  operationName: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface VideoStatusResult {
  done: boolean;
  videoUrl?: string;
  error?: string;
  raw?: unknown;
}

export async function generateCopyWithGemini(
  division: string,
  platform: string,
  customPrompt?: string
): Promise<GeneratedCopyResult> {
  const response = await bffFetch('/ai/generate-copy', {
    method: 'POST',
    body: JSON.stringify({
      prompt: customPrompt,
      platform,
      division,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }

  const data = await response.json() as { copy?: GeneratedCopyResult; result?: GeneratedCopyResult; fullText?: string };
  const copy = data.copy || data.result;
  if (!copy) throw new Error('Resposta sem copy');
  if (data.fullText && !copy.fullText) copy.fullText = data.fullText;
  return copy;
}

export async function generateVideoPrompt(
  division: string,
  script: string,
  format: string
): Promise<string> {
  const response = await bffFetch('/ai/generate-video-prompt', {
    method: 'POST',
    body: JSON.stringify({ division, script, format }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }

  const data = await response.json() as { prompt: string };
  return data.prompt;
}

export async function startVideoGeneration(
  prompt: string,
  aspectRatio: '9:16' | '16:9' = '9:16',
  durationSeconds = 6
): Promise<string> {
  const response = await bffFetch('/ai/generate-video', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      format: aspectRatio,
      durationSeconds,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { error?: string }).error || `HTTP ${response.status}`;
    if (message.includes('429') || message.includes('quota') || message.includes('QUOTA')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw new Error(message);
  }

  const data = await response.json() as { job_id: number; operation_name?: string; quota_exceeded?: boolean; error?: string };

  // Backend retorna 200 com quota_exceeded quando Google rejeita por quota
  if (data.quota_exceeded || data.error === 'QUOTA_EXCEEDED') {
    throw new Error('QUOTA_EXCEEDED');
  }

  return String(data.job_id);
}

export async function pollVideoStatus(operationName: string): Promise<VideoStatusResult> {
  const response = await bffFetch(`/ai/video-status/${operationName}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${response.status}`);
  }

  const data = await response.json() as {
    status: 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
    raw?: unknown;
  };

  if (data.status === 'processing') {
    return { done: false, raw: data.raw };
  }

  if (data.status === 'failed') {
    return { done: true, error: data.error };
  }

  return { done: true, videoUrl: data.videoUrl, raw: data.raw };
}

export async function waitForVideo(
  operationName: string,
  onProgress?: (attempt: number) => void,
  maxAttempts = 30,
  intervalMs = 5000
): Promise<VideoStatusResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    onProgress?.(attempt);
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2000 : intervalMs));

    const status = await pollVideoStatus(operationName);
    if (status.done) return status;
  }

  return { done: true, error: 'Timeout: vídeo demorou demais para processar.' };
}

export async function checkApiAccess(): Promise<{
  gemini: boolean;
  veo: boolean;
  quotaOk: boolean;
  error?: string;
}> {
  try {
    const response = await bffFetch('/flow/health/gemini');
    if (!response.ok) {
      return { gemini: false, veo: false, quotaOk: false };
    }
    return { gemini: true, veo: true, quotaOk: true };
  } catch (error) {
    return { gemini: false, veo: false, quotaOk: false, error: String(error) };
  }
}

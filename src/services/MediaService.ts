import { bffFetch, bffUpload } from './BFFClient';

export interface MediaAsset {
  id: number;
  type: 'video' | 'image';
  format: string;
  size: number;
  duration: number | null;
  url: string;
  originalName?: string;
  createdAt: string;
}

export interface MediaAnalysis {
  hook: string;
  body: string;
  cta: string;
  tags: string[];
  description: string;
  suggestedFormat: string;
  mood: string;
}

export async function uploadMedia(file: File): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await bffUpload('/media/upload', formData);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Upload falhou: HTTP ${response.status}`);
  }

  return response.json() as Promise<MediaAsset>;
}

export async function listMedia(): Promise<MediaAsset[]> {
  const response = await bffFetch('/media/list');
  if (!response.ok) return [];
  const data = await response.json() as { media: MediaAsset[] };
  return data.media || [];
}

export async function analyzeMedia(
  mediaId: number,
  platform: string,
  division: string
): Promise<{ analysis: MediaAnalysis; tokensUsed: number }> {
  const response = await bffFetch(`/media/analyze/${mediaId}`, {
    method: 'POST',
    body: JSON.stringify({ platform, division }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Análise falhou: HTTP ${response.status}`);
  }

  return response.json() as Promise<{ analysis: MediaAnalysis; tokensUsed: number }>;
}

export async function deleteMedia(id: number): Promise<void> {
  await bffFetch(`/media/${id}`, { method: 'DELETE' });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

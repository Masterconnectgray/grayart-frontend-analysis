/**
 * GeminiService.ts
 * Integração real com Google Gemini AI + Veo 3 Video Generation
 * Divisão: Gray Art / Connect Gray / Gray Up / Gray Up Flow
 */

import type { Division } from '../constants/Themes';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

// ─── Contexto por divisão ─────────────────────────────────────────────────────

const DIVISION_CONTEXT: Record<Division, string> = {
  'connect-gray': `
Empresa: Connect Gray — Rede de networking para síndicos, administradoras e gestores prediais no Brasil.
Produto principal: Coffee Meet (eventos presenciais de networking condominial).
Tom: profissional, direto, baseado em dados reais, autoritativo.
Público: síndicos, administradoras de condomínios, gestores prediais.
Diferencial: comunidade conectada, fornecedores verificados, eventos presenciais.
`,
  'gray-up': `
Empresa: Gray Up — Modernização de elevadores, projetos elétricos e instalação de carregadores veiculares.
Tom: técnico, confiante, baseado em resultados de obra, segurança.
Público: condomínios, construtoras, síndicos, facilities managers.
Diferencial: equipe técnica certificada, projetos elétricos completos, modernização sem parada.
`,
  'gray-up-flow': `
Empresa: Gray Up Flow — Consultoria Lean e gestão de processos para empresas em crescimento.
Tom: estratégico, analítico, focado em ROI e resultados mensuráveis.
Público: empresários, transportadoras, PMEs em crescimento.
Diferencial: metodologia Lean Manufacturing, resultados em 90 dias, KPIs documentados.
`,
  'gray-art': `
Empresa: Gray Art — Agência de branding, design e marketing digital premium.
Tom: criativo, aspiracional, focado em estética e resultados de vendas.
Público: empresas, marcas, profissionais liberais.
Diferencial: identidade visual estratégica, social media gerenciada, resultados mensuráveis.
`,
};

const PLATFORM_CONTEXT: Record<string, string> = {
  instagram: 'Instagram Reels (9:16, máximo atenção nos 3 primeiros segundos, legendas no estilo TikTok)',
  tiktok: 'TikTok (viral, trends, humor, storytelling rápido)',
  linkedin: 'LinkedIn (artigo profissional, tom executivo, dados e cases)',
  youtube: 'YouTube Shorts / Vídeo longo (educacional, completo, SEO otimizado)',
};

// ─── Geração de Copy com Gemini ───────────────────────────────────────────────

export async function generateCopyWithGemini(
  division: Division,
  platform: string,
  customPrompt?: string
): Promise<GeneratedCopyResult> {
  const divCtx = DIVISION_CONTEXT[division];
  const platCtx = PLATFORM_CONTEXT[platform] || platform;

  const systemPrompt = `Você é um copywriter expert em marketing digital brasileiro, especialista em conteúdo para redes sociais.

${divCtx}

Plataforma alvo: ${platCtx}

${customPrompt ? `Tema específico: ${customPrompt}` : ''}

Crie um post completo otimizado para conversão. Responda SOMENTE em JSON válido com esta estrutura:
{
  "hook": "frase de gancho impactante (max 15 palavras)",
  "body": "corpo do post com dados reais, estruturado com emojis quando adequado (max 150 palavras)",
  "cta": "chamada para ação clara e específica (max 20 palavras)",
  "tags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6"]
}`;

  const response = await fetch(
    `${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extrai JSON mesmo se vier com ```json ... ```
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Resposta da IA não retornou JSON válido');

  const parsed = JSON.parse(jsonMatch[0]);
  const fullText = `${parsed.hook}\n\n${parsed.body}\n\n${parsed.cta}\n\n${parsed.tags.map((t: string) => '#' + t).join(' ')}`;

  return { ...parsed, fullText };
}

// ─── Geração de Prompt de Vídeo com Gemini ────────────────────────────────────

export async function generateVideoPrompt(
  division: Division,
  script: string,
  format: string
): Promise<string> {
  const divCtx = DIVISION_CONTEXT[division];
  const isVertical = format.includes('reels') || format.includes('9:16') || format.includes('tiktok');

  const systemPrompt = `Você é um diretor criativo especialista em vídeos para redes sociais.

${divCtx}

Formato: ${isVertical ? 'Vertical 9:16 (Reels/TikTok)' : 'Horizontal 16:9 (YouTube/LinkedIn)'}

Script/Tema do vídeo:
${script}

Crie um prompt detalhado em INGLÊS para geração de vídeo com IA (Veo 3). O prompt deve:
- Descrever a cena visual principal (pessoas, ambiente, iluminação)
- Especificar o estilo cinematográfico (câmera, movimento, cor)
- Ser profissional e adequado para marketing B2B
- Ter entre 40-80 palavras
- NÃO incluir texto ou legendas na cena

Responda APENAS com o prompt em inglês, sem explicações.`;

  const response = await fetch(
    `${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ─── Iniciar Geração de Vídeo com Veo 3 ──────────────────────────────────────

export async function startVideoGeneration(
  prompt: string,
  aspectRatio: '9:16' | '16:9' = '9:16',
  durationSeconds: number = 6
): Promise<string> {
  // Clamp duration entre 4 e 8 segundos (limite da API)
  const duration = Math.min(8, Math.max(4, durationSeconds));

  const response = await fetch(
    `${BASE_URL}/models/veo-3.0-generate-001:predictLongRunning?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          aspectRatio,
          durationSeconds: duration,
          sampleCount: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json();
    const msg = err?.error?.message || `HTTP ${response.status}`;

    // Quota esgotada — precisa de billing ativado
    if (response.status === 429) {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw new Error(msg);
  }

  const data = await response.json();
  // Retorna o nome da operação para polling
  return data?.name || '';
}

// ─── Polling de Status da Operação ───────────────────────────────────────────

export async function pollVideoStatus(operationName: string): Promise<VideoStatusResult> {
  const response = await fetch(
    `${BASE_URL}/${operationName}?key=${API_KEY}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.done) {
    return { done: false, raw: data };
  }

  // Veo 3 retorna em generateVideoResponse.generatedSamples
  const samples = data?.response?.generateVideoResponse?.generatedSamples;
  if (samples && samples.length > 0) {
    const videoUri = samples[0]?.video?.uri;
    if (videoUri) {
      // Adicionar API key na URI para download autenticado
      const authedUrl = videoUri.includes('?')
        ? `${videoUri}&key=${API_KEY}`
        : `${videoUri}?key=${API_KEY}`;
      return { done: true, videoUrl: authedUrl };
    }
  }

  // Fallback: formato antigo com predictions
  const predictions = data?.response?.predictions;
  if (predictions && predictions.length > 0) {
    const videoB64 = predictions[0]?.bytesBase64Encoded;
    const mimeType = predictions[0]?.mimeType || 'video/mp4';

    if (videoB64) {
      const byteChars = atob(videoB64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArr[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArr], { type: mimeType });
      const videoUrl = URL.createObjectURL(blob);
      return { done: true, videoUrl };
    }

    const directUrl = predictions[0]?.uri || predictions[0]?.videoUri;
    if (directUrl) return { done: true, videoUrl: directUrl };
  }

  if (data.error) {
    return { done: true, error: data.error.message };
  }

  return { done: true, raw: data };
}

// ─── Polling com retry automático ────────────────────────────────────────────

export async function waitForVideo(
  operationName: string,
  onProgress?: (attempt: number) => void,
  maxAttempts = 30,
  intervalMs = 5000
): Promise<VideoStatusResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    onProgress?.(attempt);
    await new Promise(r => setTimeout(r, attempt === 0 ? 2000 : intervalMs));

    const status = await pollVideoStatus(operationName);
    if (status.done) return status;
  }

  return { done: true, error: 'Timeout: vídeo demorou demais para processar.' };
}

// ─── Verificar se a chave tem acesso a geração de vídeo ──────────────────────

export async function checkApiAccess(): Promise<{
  gemini: boolean;
  veo: boolean;
  quotaOk: boolean;
  error?: string;
}> {
  try {
    const resp = await fetch(
      `${BASE_URL}/models?key=${API_KEY}`
    );

    if (!resp.ok) return { gemini: false, veo: false, quotaOk: false };

    const data = await resp.json();
    const models: string[] = (data.models || []).map((m: { name: string }) => m.name);

    const gemini = models.some(m => m.includes('gemini-2'));
    const veo = models.some(m => m.includes('veo'));

    // Testa uma chamada real pequena ao Gemini
    const testResp = await fetch(
      `${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ok' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      }
    );

    const quotaOk = testResp.status !== 429;
    return { gemini, veo, quotaOk };
  } catch (e) {
    return { gemini: false, veo: false, quotaOk: false, error: String(e) };
  }
}

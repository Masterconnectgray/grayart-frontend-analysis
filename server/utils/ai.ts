export const DIVISION_CONTEXT: Record<string, string> = {
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

export const PLATFORM_CONTEXT: Record<string, string> = {
  instagram: 'Instagram Reels (9:16, máximo atenção nos 3 primeiros segundos, legendas no estilo TikTok)',
  tiktok: 'TikTok (viral, trends, humor, storytelling rápido)',
  linkedin: 'LinkedIn (artigo profissional, tom executivo, dados e cases)',
  youtube: 'YouTube Shorts / Vídeo longo (educacional, completo, SEO otimizado)',
};

export function buildCopyPrompt(division: string, platform: string, prompt?: string) {
  const divCtx = DIVISION_CONTEXT[division] || DIVISION_CONTEXT['gray-art'];
  const platCtx = PLATFORM_CONTEXT[platform] || platform;

  return `Você é um copywriter expert em marketing digital brasileiro, especialista em conteúdo para redes sociais.

${divCtx}

Plataforma alvo: ${platCtx}

${prompt ? `Tema específico: ${prompt}` : ''}

Crie um post completo otimizado para conversão. Responda SOMENTE em JSON válido com esta estrutura:
{
  "hook": "frase de gancho impactante (max 15 palavras)",
  "body": "corpo do post com dados reais, estruturado com emojis quando adequado (max 150 palavras)",
  "cta": "chamada para ação clara e específica (max 20 palavras)",
  "tags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6"]
}`;
}

export function buildVideoPromptPrompt(division: string, script: string, format: string) {
  const divCtx = DIVISION_CONTEXT[division] || DIVISION_CONTEXT['gray-art'];
  const isVertical = format.includes('reels') || format.includes('9:16') || format.includes('tiktok');

  return `Você é um diretor criativo especialista em vídeos para redes sociais.

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
}

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

// Algoritmo 2026: sends > watch time > saves > comentarios > likes
const PLATFORM_RULES: Record<string, {
  context: string;
  charLimit: number;
  hashtagCount: string;
  format: string;
  algorithm: string;
}> = {
  instagram: {
    context: 'Instagram Reels/Feed (9:16 vertical)',
    charLimit: 2200,
    hashtagCount: '5-8',
    format: 'gancho visual nos primeiros 3 segundos, texto curto com quebras de linha, emojis estrategicos',
    algorithm: `ALGORITMO INSTAGRAM 2026 (prioridade de ranqueamento):
1. SENDS (compartilhamentos via DM) — MAIS IMPORTANTE. Crie conteudo que a pessoa PRECISA mandar pra alguem.
2. WATCH TIME — retenção no Reel/video. Hook nos primeiros 1.5s.
3. SAVES — conteudo util que a pessoa salva pra depois. Use listas, dados, dicas praticas.
4. COMENTARIOS — perguntas diretas no CTA, enquetes, opinioes polemicas.
5. LIKES — menor peso, mas volume importa.
Formato ideal: Hook provocativo → Dado/estatistica chocante → Solucao pratica → CTA que gera SEND ("manda pro seu sindico")`,
  },
  tiktok: {
    context: 'TikTok (9:16 vertical, feed For You)',
    charLimit: 4000,
    hashtagCount: '3-5',
    format: 'storytelling rapido, linguagem informal, trends, POV, humor, cortes secos',
    algorithm: `ALGORITMO TIKTOK 2026:
1. WATCH TIME COMPLETO — video precisa ser assistido ate o final. Duracao ideal: 15-45s.
2. REPLAY — criar loop ou surpresa no final que faz a pessoa reassistir.
3. COMPARTILHAMENTOS — conteudo que gera "kkk manda pro fulano".
4. COMENTARIOS — polemicas leves, perguntas, "voce concorda?".
5. FOLLOWS do video — conteudo que faz a pessoa querer ver mais.
Tom: informal, direto, sem frescura. Use girias brasileiras. Nao pareca propaganda.
Formato ideal: POV/Situacao → Conflito/Drama → Virada → CTA casual`,
  },
  linkedin: {
    context: 'LinkedIn (feed profissional, artigos)',
    charLimit: 3000,
    hashtagCount: '3-5',
    format: 'texto longo estruturado com quebras de linha a cada 1-2 frases, sem emojis excessivos, tom executivo',
    algorithm: `ALGORITMO LINKEDIN 2026:
1. DWELL TIME — tempo que a pessoa PARA pra ler. Texto longo e bem estruturado performa melhor.
2. COMENTARIOS LONGOS — gerar debate profissional. Perguntas abertas no final.
3. RESHARES com opiniao — conteudo que a pessoa republica adicionando sua visao.
4. CLICKS no perfil — autoridade gera curiosidade.
5. REACOES (nao so like — "Genial", "Apoio", "Amei" pesam mais).
Formato ideal:
- 1a linha: gancho forte (aparece no preview, PRECISA gerar clique em "ver mais")
- Quebra de linha a cada 1-2 frases (facilita leitura mobile)
- Dados concretos, cases reais, numeros
- Opiniao forte/controversa no meio
- Pergunta aberta no final
- Hashtags NO FINAL (nao no meio do texto)
- NAO use emojis em excesso (maximo 2-3 no post inteiro)`,
  },
  youtube: {
    context: 'YouTube (Shorts 9:16 ou Video longo 16:9)',
    charLimit: 5000,
    hashtagCount: '8-15',
    format: 'titulo SEO otimizado, descricao com timestamps e links, tags de busca',
    algorithm: `ALGORITMO YOUTUBE 2026:
1. CTR (Click-Through Rate) — titulo + thumbnail VENDEM o clique. Titulo max 60 chars, curiosidade/numero.
2. WATCH TIME — retencao media. Primeiros 30s decidem se a pessoa fica.
3. ENGAGEMENT — likes, comentarios, shares.
4. SESSION TIME — se o video leva a pessoa a assistir MAIS videos no canal.
5. SUBSCRIBE RATE — conversao de viewer em inscrito.
Formato ideal do JSON:
- hook = TITULO do video (max 60 chars, SEO, numero + curiosidade)
- body = DESCRICAO do video (com timestamps se longo, links, resumo)
- cta = frase do video pedindo inscricao/like
- tags = palavras-chave SEO (volume de busca)`,
  },
};

export const PLATFORM_CONTEXT: Record<string, string> = {
  instagram: PLATFORM_RULES.instagram.context,
  tiktok: PLATFORM_RULES.tiktok.context,
  linkedin: PLATFORM_RULES.linkedin.context,
  youtube: PLATFORM_RULES.youtube.context,
};

export function buildCopyPrompt(division: string, platform: string, prompt?: string) {
  const divCtx = DIVISION_CONTEXT[division] || DIVISION_CONTEXT['gray-art'];
  const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.instagram;

  return `Voce e um copywriter expert em marketing digital brasileiro com profundo conhecimento dos algoritmos de cada rede social em 2026.

${divCtx}

PLATAFORMA: ${rules.context}
LIMITE DE CARACTERES: ${rules.charLimit} (body NUNCA pode passar disso)
HASHTAGS: exatamente ${rules.hashtagCount} hashtags relevantes
FORMATO: ${rules.format}

${rules.algorithm}

${prompt ? `TEMA ESPECIFICO DO CLIENTE: ${prompt}` : 'Crie sobre o tema mais relevante para o publico desta empresa.'}

REGRAS OBRIGATORIAS:
- O hook PRECISA fazer a pessoa parar de rolar o feed em 1.5 segundos
- O body deve usar a estrutura otimizada para o algoritmo desta plataforma
- O CTA deve gerar a ACAO de maior peso no algoritmo (send no IG, watch time no TikTok, comentario no LinkedIn, inscricao no YouTube)
- Tags devem ser relevantes para busca/discovery nesta plataforma
- Escreva em portugues brasileiro natural, como um brasileiro real fala
- NAO use linguagem generica de IA ("descubra como", "voce sabia", "neste post")

Responda SOMENTE em JSON valido:
{
  "hook": "gancho impactante (max 15 palavras)",
  "body": "corpo completo otimizado para ${platform} (max ${rules.charLimit} chars)",
  "cta": "chamada para acao que gera a metrica principal do algoritmo (max 25 palavras)",
  "tags": [${rules.hashtagCount.split('-').pop()} hashtags como strings]
}`;
}

export function buildVideoPromptPrompt(division: string, script: string, format: string) {
  const divCtx = DIVISION_CONTEXT[division] || DIVISION_CONTEXT['gray-art'];
  const isVertical = format.includes('reels') || format.includes('9:16') || format.includes('tiktok');

  return `Voce e um diretor criativo especialista em videos para redes sociais.

${divCtx}

Formato: ${isVertical ? 'Vertical 9:16 (Reels/TikTok)' : 'Horizontal 16:9 (YouTube/LinkedIn)'}

Script/Tema do video:
${script}

Crie um prompt detalhado em INGLES para geracao de video com IA (Veo 3). O prompt deve:
- Descrever a cena visual principal (pessoas, ambiente, iluminacao)
- Especificar o estilo cinematografico (camera, movimento, cor)
- Ser profissional e adequado para marketing B2B
- Ter entre 40-80 palavras
- NAO incluir texto ou legendas na cena

Responda APENAS com o prompt em ingles, sem explicacoes.`;
}

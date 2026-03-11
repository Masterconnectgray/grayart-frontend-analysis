import type { Division } from './Themes';

export interface SocialFormat {
  id: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  ratio: string;
  maxDuration: number;
  icon: string;
}

export const SOCIAL_FORMATS: SocialFormat[] = [
  { id: 'reels', label: 'Instagram Reels', platform: 'instagram', width: 1080, height: 1920, ratio: '9:16', maxDuration: 90, icon: 'IG' },
  { id: 'stories', label: 'Instagram Stories', platform: 'instagram', width: 1080, height: 1920, ratio: '9:16', maxDuration: 15, icon: 'IG' },
  { id: 'feed-square', label: 'Instagram Feed', platform: 'instagram', width: 1080, height: 1080, ratio: '1:1', maxDuration: 60, icon: 'IG' },
  { id: 'feed-portrait', label: 'Instagram Portrait', platform: 'instagram', width: 1080, height: 1350, ratio: '4:5', maxDuration: 60, icon: 'IG' },
  { id: 'tiktok', label: 'TikTok', platform: 'tiktok', width: 1080, height: 1920, ratio: '9:16', maxDuration: 180, icon: 'TT' },
  { id: 'youtube-shorts', label: 'YouTube Shorts', platform: 'youtube', width: 1080, height: 1920, ratio: '9:16', maxDuration: 60, icon: 'YT' },
  { id: 'youtube-landscape', label: 'YouTube', platform: 'youtube', width: 1920, height: 1080, ratio: '16:9', maxDuration: 600, icon: 'YT' },
  { id: 'facebook-reels', label: 'Facebook Reels', platform: 'facebook', width: 1080, height: 1920, ratio: '9:16', maxDuration: 90, icon: 'FB' },
  { id: 'facebook-feed', label: 'Facebook Feed', platform: 'facebook', width: 1080, height: 1080, ratio: '1:1', maxDuration: 120, icon: 'FB' },
  { id: 'whatsapp-status', label: 'WhatsApp Status', platform: 'whatsapp', width: 1080, height: 1920, ratio: '9:16', maxDuration: 30, icon: 'WA' },
  { id: 'linkedin-video', label: 'LinkedIn Video', platform: 'linkedin', width: 1920, height: 1080, ratio: '16:9', maxDuration: 600, icon: 'LI' },
  { id: 'linkedin-vertical', label: 'LinkedIn Vertical', platform: 'linkedin', width: 1080, height: 1920, ratio: '9:16', maxDuration: 60, icon: 'LI' },
  { id: 'x-video', label: 'X (Twitter)', platform: 'x', width: 1920, height: 1080, ratio: '16:9', maxDuration: 140, icon: 'X' },
  { id: 'pinterest-pin', label: 'Pinterest Pin', platform: 'pinterest', width: 1000, height: 1500, ratio: '2:3', maxDuration: 60, icon: 'PN' },
  { id: 'snapchat', label: 'Snapchat', platform: 'snapchat', width: 1080, height: 1920, ratio: '9:16', maxDuration: 60, icon: 'SC' },
];

export interface SceneTemplate {
  textPosition: 'top' | 'center' | 'bottom';
  textAlign: 'left' | 'center' | 'right';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  bgStyle: 'solid' | 'gradient' | 'image';
  overlay: boolean;
}

export interface VideoTemplate {
  id: string;
  name: string;
  category: string;
  scenes: {
    label: string;
    duration: number;
    text: string;
    sceneStyle: SceneTemplate;
    bgColor: string;
    bgGradient?: string;
  }[];
  totalDuration: number;
  suggestedFormat: string;
}

export const VIDEO_TEMPLATES: Record<Division, VideoTemplate[]> = {
  'connect-gray': [
    {
      id: 'cg-dor-sindico',
      name: 'Dor do Síndico',
      category: 'Problema',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: 'A maioria dos síndicos só descobre esse problema quando o elevador para.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#1a0a2e', bgGradient: 'linear-gradient(135deg, #1a0a2e, #9370DB)' },
        { label: 'Dor', duration: 5, text: 'Custos altos, moradores reclamando e fornecedores que não resolvem.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#2d1b4e' },
        { label: 'Explicação', duration: 7, text: 'Sem manutenção preventiva, os custos explodem e a segurança fica comprometida.', sceneStyle: { textPosition: 'bottom', textAlign: 'left', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Solução', duration: 10, text: 'A Connect Gray conecta síndicos aos melhores especialistas do mercado.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#9370DB', bgGradient: 'linear-gradient(135deg, #9370DB, #6a3fbf)' },
        { label: 'CTA', duration: 5, text: 'Fale com a Connect Gray. Link na bio!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#9370DB', bgGradient: 'linear-gradient(135deg, #6a3fbf, #9370DB, #c084fc)' },
      ],
    },
    {
      id: 'cg-coffee-meet',
      name: 'Coffee Meet',
      category: 'Autoridade',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: 'Mais de 200 síndicos já passaram pelo nosso Coffee Meet.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#1a0a2e', bgGradient: 'linear-gradient(135deg, #000, #9370DB)' },
        { label: 'Contexto', duration: 5, text: 'Um evento exclusivo de networking para síndicos e fornecedores.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Benefícios', duration: 7, text: 'Conexões reais, fornecedores validados e soluções que funcionam.', sceneStyle: { textPosition: 'bottom', textAlign: 'left', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#2d1b4e' },
        { label: 'Prova Social', duration: 10, text: 'Síndicos que participam reduzem custos em até 40% com os parceiros certos.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#9370DB', bgGradient: 'linear-gradient(135deg, #9370DB, #7c3aed)' },
        { label: 'CTA', duration: 5, text: 'Participe do próximo Coffee Meet. Inscreva-se!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#9370DB', bgGradient: 'linear-gradient(135deg, #6a3fbf, #c084fc)' },
      ],
    },
  ],
  'gray-up': [
    {
      id: 'gu-modernizacao',
      name: 'Modernização Elevadores',
      category: 'Problema',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: 'Seu elevador pode estar funcionando errado e você não sabe.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#0a1628', bgGradient: 'linear-gradient(135deg, #0a1628, #2563EB)' },
        { label: 'Dor', duration: 5, text: 'Elevadores antigos gastam 60% mais energia e quebram 5x mais.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Explicação', duration: 7, text: 'Sistemas sem atualização são um risco de segurança e um ralo de dinheiro.', sceneStyle: { textPosition: 'bottom', textAlign: 'left', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#0f1f3d' },
        { label: 'Solução', duration: 10, text: 'A Gray Up moderniza com tecnologia de ponta e garantia técnica.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#2563EB', bgGradient: 'linear-gradient(135deg, #2563EB, #1d4ed8)' },
        { label: 'CTA', duration: 5, text: 'Solicite uma avaliação gratuita. Link na bio!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#2563EB', bgGradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' },
      ],
    },
    {
      id: 'gu-carregador',
      name: 'Carregadores Veiculares',
      category: 'Inovação',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: 'Carregadores veiculares nos condomínios é o futuro. E o futuro é agora.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#0a1628', bgGradient: 'linear-gradient(135deg, #000, #2563EB)' },
        { label: 'Tendência', duration: 5, text: 'Veículos elétricos crescem 40% ao ano. Seu prédio está preparado?', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Problema', duration: 7, text: 'Prédios sem infraestrutura perdem valor e ficam para trás no mercado.', sceneStyle: { textPosition: 'bottom', textAlign: 'left', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#0f1f3d' },
        { label: 'Solução', duration: 10, text: 'A Gray Up projeta e instala estações de carregamento para condomínios.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#2563EB', bgGradient: 'linear-gradient(135deg, #2563EB, #60a5fa)' },
        { label: 'CTA', duration: 5, text: 'Modernize seu condomínio. Fale com a Gray Up!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#2563EB', bgGradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' },
      ],
    },
  ],
  'gray-up-flow': [
    {
      id: 'guf-processos',
      name: 'Empresa Sem Processo',
      category: 'Problema',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: 'Se sua empresa cresce mas o dinheiro não sobra, existe um erro aqui.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#0a2e1a', bgGradient: 'linear-gradient(135deg, #0a2e1a, #10B981)' },
        { label: 'Dor', duration: 5, text: 'Retrabalho, caos e o dono preso na operação 14h por dia.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Explicação', duration: 7, text: 'Empresas sem processos perdem até 30% do faturamento com ineficiência.', sceneStyle: { textPosition: 'bottom', textAlign: 'left', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1a3a2e' },
        { label: 'Solução', duration: 10, text: 'A Gray Up Flow implanta processos Lean que geram resultado real.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#10B981', bgGradient: 'linear-gradient(135deg, #10B981, #059669)' },
        { label: 'CTA', duration: 5, text: 'Organize sua empresa. Fale com a Gray Up Flow!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#10B981', bgGradient: 'linear-gradient(135deg, #059669, #34d399)' },
      ],
    },
    {
      id: 'guf-caso-sucesso',
      name: 'Caso de Sucesso',
      category: 'Autoridade',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: 'Como uma transportadora triplicou o lucro em 6 meses.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#0a2e1a', bgGradient: 'linear-gradient(135deg, #000, #10B981)' },
        { label: 'Antes', duration: 5, text: 'Faturava R$500k/mês mas o lucro era zero. Caos total.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Processo', duration: 7, text: 'Mapeamos gargalos, eliminamos desperdícios e estruturamos a operação.', sceneStyle: { textPosition: 'bottom', textAlign: 'left', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1a3a2e' },
        { label: 'Resultado', duration: 10, text: 'Em 6 meses: lucro triplicou, retrabalho caiu 70%, equipe autônoma.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#10B981', bgGradient: 'linear-gradient(135deg, #22c55e, #10B981)' },
        { label: 'CTA', duration: 5, text: 'Quer o mesmo resultado? Gray Up Flow. Link na bio!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#10B981', bgGradient: 'linear-gradient(135deg, #059669, #34d399)' },
      ],
    },
  ],
  'gray-art': [
    {
      id: 'ga-marca-invisivel',
      name: 'Marca Invisível',
      category: 'Problema',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: 'Postar não é marketing. E sua marca está invisível.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#1a0a2e', bgGradient: 'linear-gradient(135deg, #1a0a2e, #9370DB)' },
        { label: 'Dor', duration: 5, text: 'Redes sociais fracas, zero autoridade e clientes indo pro concorrente.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Explicação', duration: 7, text: 'Sem posicionamento claro, sua marca é só mais um ruído no feed.', sceneStyle: { textPosition: 'bottom', textAlign: 'left', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#2d1b4e' },
        { label: 'Solução', duration: 10, text: 'A Gray ART posiciona sua marca com branding e estratégia digital.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#9370DB', bgGradient: 'linear-gradient(135deg, #9370DB, #eab308)' },
        { label: 'CTA', duration: 5, text: 'Posicione sua marca. Gray ART. Link na bio!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#eab308', bgGradient: 'linear-gradient(135deg, #9370DB, #eab308)' },
      ],
    },
    {
      id: 'ga-erros-amador',
      name: '3 Erros Amadores',
      category: 'Educacional',
      suggestedFormat: 'reels',
      totalDuration: 30,
      scenes: [
        { label: 'Gancho', duration: 3, text: '3 erros que fazem sua empresa parecer amadora.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#1a0a2e', bgGradient: 'linear-gradient(135deg, #000, #eab308)' },
        { label: 'Erro 1', duration: 5, text: 'Visual inconsistente — cada post parece de uma empresa diferente.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Erro 2', duration: 5, text: 'Postar sem estratégia — conteúdo que não converte é vaidade.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#2d1b4e' },
        { label: 'Erro 3', duration: 5, text: 'Ignorar branding — sem identidade, sem autoridade, sem vendas.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'medium', bgStyle: 'solid', overlay: false }, bgColor: '#1e1e1e' },
        { label: 'Solução', duration: 7, text: 'A Gray ART corrige tudo isso com estratégia e resultado.', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'large', bgStyle: 'gradient', overlay: true }, bgColor: '#9370DB', bgGradient: 'linear-gradient(135deg, #9370DB, #eab308)' },
        { label: 'CTA', duration: 5, text: 'Pare de parecer amador. Fale com a Gray ART!', sceneStyle: { textPosition: 'center', textAlign: 'center', fontSize: 'xlarge', bgStyle: 'gradient', overlay: true }, bgColor: '#eab308', bgGradient: 'linear-gradient(135deg, #eab308, #9370DB)' },
      ],
    },
  ],
};

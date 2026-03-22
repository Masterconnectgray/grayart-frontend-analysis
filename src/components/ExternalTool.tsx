import { useState } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { Card } from '../design-system';
import { ExternalLink, Maximize2, ArrowLeft } from 'lucide-react';

interface ExternalToolProps {
  division: Division;
  tool: 'canva' | 'capcut';
}

const TOOLS = {
  canva: {
    name: 'Canva',
    url: 'https://www.canva.com',
    editorUrl: 'https://www.canva.com/design/create',
    videoUrl: 'https://www.canva.com/create/videos/',
    color: '#00C4CC',
    logo: '/logos/canva_icon_c.png',
    features: [
      'Criar videos com templates prontos',
      'Editar imagens e thumbnails',
      'Criar carrosseis para Instagram',
      'Animar textos e elementos',
      'Exportar em qualquer formato',
    ],
    shortcuts: [
      { label: 'Criar Video', url: 'https://www.canva.com/create/videos/' },
      { label: 'Criar Reels', url: 'https://www.canva.com/create/instagram-reels/' },
      { label: 'Criar Story', url: 'https://www.canva.com/create/instagram-stories/' },
      { label: 'Criar Post', url: 'https://www.canva.com/create/social-media-posts/' },
      { label: 'Criar Thumbnail', url: 'https://www.canva.com/create/youtube-thumbnails/' },
      { label: 'Criar Logo', url: 'https://www.canva.com/create/logos/' },
    ],
  },
  capcut: {
    name: 'CapCut',
    url: 'https://www.capcut.com',
    editorUrl: 'https://www.capcut.com/editor',
    videoUrl: 'https://www.capcut.com/editor',
    color: '#000000',
    logo: '/logos/capcut_symbol.png',
    features: [
      'Editar videos com timeline profissional',
      'Legendas automaticas com IA',
      'Remover fundo de videos',
      'Efeitos e transicoes cinematograficas',
      'Exportar em alta qualidade',
    ],
    shortcuts: [
      { label: 'Editor Online', url: 'https://www.capcut.com/editor' },
      { label: 'Templates', url: 'https://www.capcut.com/templates' },
      { label: 'Legendas IA', url: 'https://www.capcut.com/tools/auto-captions' },
      { label: 'Remover Fundo', url: 'https://www.capcut.com/tools/video-background-remover' },
      { label: 'Text to Speech', url: 'https://www.capcut.com/tools/text-to-speech' },
    ],
  },
};

export default function ExternalTool({ division, tool }: ExternalToolProps) {
  const _theme = DIVISIONS[division];
  const config = TOOLS[tool];
  const [showEmbed, setShowEmbed] = useState(false);
  const basePath = import.meta.env.DEV ? '' : '/grayart';

  if (showEmbed) {
    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setShowEmbed(false)} className="flex items-center gap-2 text-sm font-bold text-[var(--text-color)] opacity-60 hover:opacity-100 transition">
            <ArrowLeft size={16} /> Voltar
          </button>
          <a href={config.editorUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition hover:brightness-110" style={{ backgroundColor: config.color, color: '#fff' }}>
            <Maximize2 size={14} /> Abrir em tela cheia
          </a>
        </div>
        <div className="w-full rounded-2xl overflow-hidden border border-[var(--card-border)]" style={{ height: 'calc(100vh - 300px)', minHeight: 500 }}>
          <iframe
            src={config.editorUrl}
            className="w-full h-full"
            allow="clipboard-read; clipboard-write; camera; microphone"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <Card variant="elevated" padding="p-6">
        <div className="flex items-center gap-4 mb-6">
          <img src={`${basePath}${config.logo}`} alt={config.name} className="w-14 h-14 rounded-2xl" />
          <div>
            <h2 className="text-2xl font-black" style={{ color: config.color }}>{config.name}</h2>
            <p className="text-sm text-[var(--text-color)] opacity-50">Editor externo integrado ao GrayArt</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {config.shortcuts.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-4 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--primary-color)]/10 transition-all group"
            >
              <span className="text-sm font-bold text-[var(--text-color)]">{s.label}</span>
              <ExternalLink size={14} className="text-[var(--text-color)] opacity-30 group-hover:opacity-70 transition" />
            </a>
          ))}
        </div>
      </Card>

      {/* Features */}
      <Card variant="default" padding="p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-color)] opacity-40 mb-4">Funcionalidades</h3>
        <div className="space-y-2">
          {config.features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
              <span className="text-sm text-[var(--text-color)] opacity-70">{f}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Open buttons */}
      <div className="flex gap-3">
        <a
          href={config.editorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm text-white transition hover:brightness-110"
          style={{ backgroundColor: config.color }}
        >
          <ExternalLink size={16} /> Abrir {config.name}
        </a>
        <button
          onClick={() => setShowEmbed(true)}
          className="px-6 py-4 rounded-xl font-bold text-sm bg-[var(--input-bg)] text-[var(--text-color)] opacity-60 hover:opacity-100 transition"
        >
          Embutir aqui
        </button>
      </div>
    </div>
  );
}

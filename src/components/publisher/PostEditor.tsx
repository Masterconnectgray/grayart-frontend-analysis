import React from 'react';
import type { Division } from '../../constants/Themes';
import { CONTENT_TEMPLATES } from '../../constants/ContentTemplates';
import { Button } from '../../design-system';
import { Wand2 } from 'lucide-react';

interface PostEditorProps {
  division: Division;
  content: string;
  onChange: (val: string) => void;
}

export const PostEditor: React.FC<PostEditorProps> = ({ division, content, onChange }) => {
  const templates = CONTENT_TEMPLATES[division];
  const platformContent = templates?.platforms?.['instagram'];

  const applyTemplate = () => {
    if (!platformContent) return;
    const text = `${platformContent.hooks[0]}\n\n${platformContent.body[0]}\n\n${platformContent.cta[0]}\n\n${platformContent.tags.map((t: string) => '#' + t).join(' ')}`;
    onChange(text);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col h-full">
      <h3 className="text-base font-bold text-white mb-5 uppercase tracking-wide">Editor de Conteúdo</h3>
      
      {platformContent && (
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Sugestão IA Personalizada</div>
          <div className="p-4 rounded-xl bg-white/5 border-l-4 border-[var(--primary-color)] text-sm text-slate-300">
            <div className="mb-2"><strong className="text-white">Gancho:</strong> {platformContent.hooks[0]}</div>
            <div className="mb-2"><strong className="text-white">Corpo:</strong> {platformContent.body[0]}</div>
            <div className="mb-4"><strong className="text-white">CTA:</strong> {platformContent.cta[0]}</div>
            <Button size="sm" icon={Wand2} onClick={applyTemplate}>
              Aplicar no Editor
            </Button>
          </div>
        </div>
      )}

      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder="Escreva sua mensagem aqui..."
        className="w-full flex-1 min-h-[200px] p-4 rounded-xl bg-black/20 border border-white/10 text-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all"
      />
      <div className="mt-2 text-xs text-slate-400 text-right">
        {content.length} caracteres
      </div>
    </div>
  );
};

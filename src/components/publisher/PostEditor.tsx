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
  const isDark = division !== 'gray-art';
  const templates = CONTENT_TEMPLATES[division];
  const platformContent = templates?.platforms?.['instagram'];

  const applyTemplate = () => {
    if (!platformContent) return;
    const text = `${platformContent.hooks[0]}\n\n${platformContent.body[0]}\n\n${platformContent.cta[0]}\n\n${platformContent.tags.map((t: string) => '#' + t).join(' ')}`;
    onChange(text);
  };

  return (
    <div className={`border rounded-2xl p-6 flex flex-col h-full ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      <h3 className={`text-base font-bold mb-5 uppercase tracking-wide ${isDark ? 'text-white' : 'text-[#1a1a1a]'}`}>Editor de Conteúdo</h3>
      
      {platformContent && (
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Sugestão IA Personalizada</div>
          <div className={`p-4 rounded-xl border-l-4 border-[var(--primary-color)] text-sm ${isDark ? 'bg-white/5 text-slate-300' : 'bg-black/5 text-[#1a1a1a]'}`}>
            <div className="mb-2"><strong className={isDark ? 'text-white' : 'text-black'}>Gancho:</strong> {platformContent.hooks[0]}</div>
            <div className="mb-2"><strong className={isDark ? 'text-white' : 'text-black'}>Corpo:</strong> {platformContent.body[0]}</div>
            <div className="mb-4"><strong className={isDark ? 'text-white' : 'text-black'}>CTA:</strong> {platformContent.cta[0]}</div>
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
        className={`w-full flex-1 min-h-[200px] p-4 rounded-xl border text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-white border-black/10 text-[#1a1a1a]'}`}
      />
      <div className={`mt-2 text-xs text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {content.length} caracteres
      </div>
    </div>
  );
};

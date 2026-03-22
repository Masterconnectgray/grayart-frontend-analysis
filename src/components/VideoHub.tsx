import { useState, lazy, Suspense } from 'react';
import type { Division } from '../constants/Themes';
import { Film, Clapperboard } from 'lucide-react';

const VideoGenerator = lazy(() => import('./VideoGenerator'));
const VideoComposer = lazy(() => import('./VideoComposer'));

interface VideoHubProps {
  division: Division;
}

type VideoMode = 'clip' | 'composer';

export default function VideoHub({ division }: VideoHubProps) {
  const [mode, setMode] = useState<VideoMode>('clip');

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('clip')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            mode === 'clip'
              ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-lg'
              : 'bg-[var(--sub-bg)] text-slate-400 hover:text-white'
          }`}
        >
          <Film size={16} />
          Clip Unico (6s)
        </button>
        <button
          onClick={() => setMode('composer')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            mode === 'composer'
              ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-lg'
              : 'bg-[var(--sub-bg)] text-slate-400 hover:text-white'
          }`}
        >
          <Clapperboard size={16} />
          Video Composto (6-90s)
        </button>
      </div>

      <Suspense fallback={<div className="text-center py-12 text-sm opacity-40">Carregando...</div>}>
        {mode === 'clip' ? (
          <VideoGenerator division={division} />
        ) : (
          <VideoComposer division={division} />
        )}
      </Suspense>
    </div>
  );
}

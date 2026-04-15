import { useState, useCallback, useRef, useEffect } from 'react';
import type { Division } from '../../constants/Themes';
import { DIVISIONS } from '../../constants/Themes';
import {
  Upload,
  AlertTriangle,
  Film,
  Loader2,
  ArrowLeft,
  RectangleVertical,
  RectangleHorizontal,
  Square,
  Maximize2,
} from 'lucide-react';

interface VideoEditorProps {
  division: Division;
  videoUrl?: string;
}

type AspectRatio = '9:16' | '16:9' | '1:1';

const ASPECT_CONFIGS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '9:16': { width: 720, height: 1280, label: 'Vertical (Reels)' },
  '16:9': { width: 1920, height: 1080, label: 'Horizontal (YouTube)' },
  '1:1': { width: 1080, height: 1080, label: 'Quadrado (Feed)' },
};

const ASPECT_ICONS: Record<AspectRatio, typeof RectangleVertical> = {
  '9:16': RectangleVertical,
  '16:9': RectangleHorizontal,
  '1:1': Square,
};

type EditorState = 'idle' | 'loading' | 'ready' | 'error';

export default function VideoEditor({ division, videoUrl }: VideoEditorProps) {
  const theme = DIVISIONS[division];
  const [state, setState] = useState<EditorState>(videoUrl ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  const [loadedVideoUrl, setLoadedVideoUrl] = useState<string | null>(videoUrl || null);
  const [twickLoaded, setTwickLoaded] = useState(false);
  const [TwickComponents, setTwickComponents] = useState<{
    VideoEditor: any;
    LivePlayerProvider: any;
    TimelineProvider: any;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadTwick() {
      try {
        const [editorMod, playerMod, timelineMod] = await Promise.all([
          import('@twick/video-editor'),
          import('@twick/live-player'),
          import('@twick/timeline'),
        ]);
        await import('@twick/video-editor/dist/video-editor.css');
        if (!cancelled) {
          setTwickComponents({
            VideoEditor: editorMod.default,
            LivePlayerProvider: playerMod.LivePlayerProvider,
            TimelineProvider: timelineMod.TimelineProvider,
          });
          setTwickLoaded(true);
        }
      } catch (e) {
        console.error('Falha ao carregar Twick:', e);
        if (!cancelled) {
          setTwickLoaded(false);
          setError('Editor de video nao disponivel. Verifique se @twick/video-editor esta instalado.');
          setState('error');
        }
      }
    }
    loadTwick();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (videoUrl && twickLoaded) {
      setLoadedVideoUrl(videoUrl);
      setState('ready');
    }
  }, [videoUrl, twickLoaded]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Selecione um arquivo de video valido.');
      return;
    }
    setError(null);
    setState('loading');
    const url = URL.createObjectURL(file);
    setLoadedVideoUrl(url);
    setTimeout(() => setState('ready'), 300);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const config = ASPECT_CONFIGS[aspect];

  const renderUploadArea = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className={`relative w-full max-w-xl border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all duration-500 cursor-pointer group shadow-2xl ${
          isDragging
            ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 scale-[1.02]'
            : 'border-[var(--card-border)] bg-[var(--input-bg)] hover:border-[var(--primary-color)]/40 hover:bg-[var(--primary-color)]/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={onFileInput}
        />
        <Upload className="mx-auto mb-6 text-[var(--primary-color)] opacity-40 group-hover:opacity-100 transition-all duration-500" size={56} />
        <p className="text-xl font-black text-[var(--text-color)] mb-3 tracking-tight">
          Arraste um video aqui
        </p>
        <p className="text-sm text-[var(--text-color)] opacity-50 font-medium">
          ou clique para selecionar um arquivo
        </p>
        <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--text-color)] opacity-30 font-bold uppercase tracking-widest">
            MP4 • WebM • MOV — ate 500MB
          </p>
        </div>
      </div>
    </div>
  );

  const renderFormatSelector = () => (
    <div className="flex items-center gap-2">
      {(Object.keys(ASPECT_CONFIGS) as AspectRatio[]).map((ratio) => {
        const Icon = ASPECT_ICONS[ratio];
        const isActive = aspect === ratio;
        return (
          <button
            key={ratio}
            onClick={() => setAspect(ratio)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isActive
                ? 'bg-[var(--primary-color)] text-[#1a1a1a]'
                : 'bg-[var(--input-bg)] text-[var(--text-color)] opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={ASPECT_CONFIGS[ratio].label}
          >
            <Icon size={14} />
            {ratio}
          </button>
        );
      })}
    </div>
  );

  const renderEditor = () => {
    if (!TwickComponents) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--text-color)] opacity-40" size={32} />
        </div>
      );
    }

    const { VideoEditor: TwickEditor, LivePlayerProvider, TimelineProvider } = TwickComponents;

    const initialTimeline: any[] = [];
    if (loadedVideoUrl) {
      initialTimeline.push({
        id: 'track-main',
        type: 'video',
        elements: [{
          id: 'el-main-video',
          type: 'video',
          startTime: 0,
          endTime: 30,
          properties: {
            src: loadedVideoUrl,
            width: config.width,
            height: config.height,
          },
        }],
      });
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <LivePlayerProvider>
          <TimelineProvider
            initialData={{
              timeline: initialTimeline,
              version: 0,
            }}
          >
            <TwickEditor
              leftPanel={null}
              rightPanel={null}
              editorConfig={{
                videoProps: {
                  width: config.width,
                  height: config.height,
                  backgroundColor: '#000000',
                },
                timelineTickConfigs: [
                  { durationThreshold: 30, majorInterval: 5, minorTicks: 5 },
                  { durationThreshold: 300, majorInterval: 30, minorTicks: 6 },
                  { durationThreshold: 3600, majorInterval: 300, minorTicks: 5 },
                ],
                timelineZoomConfig: {
                  min: 0.5,
                  max: 3.0,
                  step: 0.25,
                  default: 1.0,
                },
                elementColors: {
                  video: theme.colors.primary,
                  audio: '#3D8B8B',
                  image: '#D4956C',
                  text: '#A78EC8',
                  caption: '#9B8ACE',
                  fragment: '#1A1A1A',
                },
              }}
              defaultPlayControls
            />
          </TimelineProvider>
        </LivePlayerProvider>
      </div>
    );
  };

  const renderError = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
        <AlertTriangle className="mx-auto mb-4 text-red-400" size={40} />
        <p className="text-red-300 font-medium mb-2">Erro no Editor</p>
        <p className="text-red-400/70 text-sm mb-4">{error}</p>
        <button
          onClick={() => { setError(null); setState('idle'); setLoadedVideoUrl(null); }}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 animate-spin text-[var(--text-color)] opacity-40" size={40} />
        <p className="text-[var(--text-color)] opacity-60 text-sm font-medium">Carregando editor...</p>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full min-h-0 bg-[var(--card-bg)] text-[var(--text-color)] transition-colors duration-500"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--input-bg)] backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setState('idle'); setLoadedVideoUrl(null); setError(null); }}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-color)] opacity-50 hover:opacity-100"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Film size={18} style={{ color: theme.colors.primary }} />
            <span className="font-black text-sm tracking-tight">Editor de Video</span>
            <span className="text-[10px] text-[var(--text-color)] opacity-30 ml-2 font-bold uppercase tracking-widest">— {theme.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state === 'ready' && renderFormatSelector()}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-color)] opacity-40 hover:opacity-100"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {state === 'idle' && renderUploadArea()}
      {state === 'loading' && renderLoading()}
      {state === 'ready' && renderEditor()}
      {state === 'error' && renderError()}
    </div>
  );
}

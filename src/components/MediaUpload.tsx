import React, { useState, useRef, useCallback } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card } from '../design-system';
import {
  uploadMedia, listMedia, analyzeMedia, deleteMedia, formatFileSize,
  type MediaAsset, type MediaAnalysis,
} from '../services/MediaService';
import {
  Upload, FileVideo, Image, Trash2, Sparkles, Copy, Check,
  Film, Loader2,
} from 'lucide-react';
import { PlatformIcon } from '../constants/SocialIcons';

interface MediaUploadProps {
  division: Division;
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
];

const MediaUpload: React.FC<MediaUploadProps> = ({ division }) => {
  const { addNotification } = useAppContext();
  const theme = DIVISIONS[division];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [activeSource, setActiveSource] = useState<'all' | 'capcut' | 'inshot' | 'canva'>('all');

  const loadMedia = useCallback(async () => {
    const list = await listMedia();
    setMedia(list);
    setMediaLoaded(true);
  }, []);

  // Load media on first render
  React.useEffect(() => {
    if (!mediaLoaded) loadMedia();
  }, [mediaLoaded, loadMedia]);

  const handleUpload = async (file: File) => {
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      addNotification('Arquivo muito grande. Limite: 100MB', 'error');
      return;
    }

    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addNotification('Formato n\u00e3o suportado. Use MP4, MOV, JPG, PNG ou WebP.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 15, 90));
    }, 200);

    try {
      const asset = await uploadMedia(file);
      clearInterval(interval);
      setUploadProgress(100);
      setMedia(prev => [asset, ...prev]);
      setSelectedMedia(asset);
      addNotification(`${asset.type === 'video' ? 'V\u00eddeo' : 'Imagem'} enviado com sucesso!`, 'success');
    } catch (error) {
      clearInterval(interval);
      addNotification(`Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleAnalyze = async () => {
    if (!selectedMedia) return;
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeMedia(selectedMedia.id, selectedPlatform, division);
      setAnalysis(result.analysis);
      addNotification(`Legenda gerada! (${result.tokensUsed} tokens)`, 'success');
    } catch (error) {
      addNotification(`Erro na an\u00e1lise: ${error instanceof Error ? error.message : 'Erro'}`, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMedia(id);
    setMedia(prev => prev.filter(m => m.id !== id));
    if (selectedMedia?.id === id) {
      setSelectedMedia(null);
      setAnalysis(null);
    }
    addNotification('M\u00eddia removida', 'info');
  };

  const handleCopyText = () => {
    if (!analysis) return;
    const text = `${analysis.hook}\n\n${analysis.body}\n\n${analysis.cta}\n\n${analysis.tags.map(t => `#${t}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('Texto copiado!', 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: theme.colors.primary }}>
            M\u00eddia + IA
          </h2>
          <p className="text-sm opacity-50 mt-1">
            Envie v\u00eddeos e imagens do CapCut, InShot ou Canva. A IA gera a legenda perfeita.
          </p>
        </div>
      </div>

      {/* Source Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all' as const, label: 'Todos', color: theme.colors.primary, logo: <Upload className="w-4 h-4" /> },
          { id: 'capcut' as const, label: 'CapCut Pro', color: '#000000', logo: <svg width="16" height="16" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#000"/><path d="M20 14v14.5c0 2.5-2 4.5-4.5 4.5S11 31 11 28.5s2-4.5 4.5-4.5c.9 0 1.7.3 2.5.7V14h2z" fill="#fff"/><path d="M28 14c3.3 0 6 2.7 6 6h-4c0-1.1-.9-2-2-2v-4z" fill="#fff"/></svg> },
          { id: 'inshot' as const, label: 'InShot Pro', color: '#F6416C', logo: <svg width="16" height="16" viewBox="0 0 48 48"><defs><linearGradient id="ig2" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#F6416C"/><stop offset="100%" stopColor="#F97B4B"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#ig2)"/><rect x="12" y="12" width="24" height="24" rx="3" stroke="#fff" strokeWidth="2.8" fill="none"/><circle cx="24" cy="24" r="5" stroke="#fff" strokeWidth="2" fill="none"/><circle cx="24" cy="24" r="2" fill="#fff"/></svg> },
          { id: 'canva' as const, label: 'Canva Pro', color: '#7B2FF7', logo: <svg width="16" height="16" viewBox="0 0 48 48"><defs><linearGradient id="cg2" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#23C6C8"/><stop offset="50%" stopColor="#6B3FA0"/><stop offset="100%" stopColor="#8B2FC0"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#cg2)"/><text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold" fontStyle="italic" fontFamily="Georgia,serif">C</text></svg> },
        ].map(src => (
          <button
            key={src.id}
            onClick={() => setActiveSource(src.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
              ${activeSource === src.id ? 'text-white shadow-md scale-[1.02]' : 'bg-white/5 opacity-60 hover:opacity-100'}`}
            style={activeSource === src.id ? { backgroundColor: src.color } : {}}
          >
            {src.logo}
            {src.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload + Gallery */}
        <div className="flex flex-col gap-4">
          {/* Drop Zone */}
          <Card>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
                ${dragOver ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 scale-[1.01]' : 'border-white/10 hover:border-white/20'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.colors.primary }} />
                  <div className="w-full max-w-[200px] h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%`, backgroundColor: theme.colors.primary }}
                    />
                  </div>
                  <span className="text-sm opacity-50">Enviando... {uploadProgress}%</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden" style={{
                    backgroundColor: activeSource === 'capcut' ? '#00000015' : activeSource === 'inshot' ? '#FF2D5515' : activeSource === 'canva' ? '#00C4CC15' : `${theme.colors.primary}15`
                  }}>
                    {activeSource === 'capcut' ? (
                      <svg width="32" height="32" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#000"/><path d="M20 14v14.5c0 2.5-2 4.5-4.5 4.5S11 31 11 28.5s2-4.5 4.5-4.5c.9 0 1.7.3 2.5.7V14h2z" fill="#fff"/><path d="M28 14c3.3 0 6 2.7 6 6h-4c0-1.1-.9-2-2-2v-4z" fill="#fff"/><path d="M28 24c-3.3 0-6-2.7-6-6h4c0 1.1.9 2 2 2v4z" fill="#25F4EE"/></svg>
                    ) : activeSource === 'inshot' ? (
                      <svg width="32" height="32" viewBox="0 0 48 48"><defs><linearGradient id="ig3" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#F6416C"/><stop offset="100%" stopColor="#F97B4B"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#ig3)"/><rect x="12" y="12" width="24" height="24" rx="3" stroke="#fff" strokeWidth="2.8" fill="none"/><line x1="20" y1="6" x2="20" y2="12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/><line x1="28" y1="36" x2="28" y2="42" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/><line x1="6" y1="28" x2="12" y2="28" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/><line x1="36" y1="20" x2="42" y2="20" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/><circle cx="24" cy="24" r="6" stroke="#fff" strokeWidth="2.5" fill="none"/><circle cx="24" cy="24" r="2.5" fill="#fff"/></svg>
                    ) : activeSource === 'canva' ? (
                      <svg width="32" height="32" viewBox="0 0 48 48"><defs><linearGradient id="cg3" x1="0" y1="0" x2="48" y2="48"><stop offset="0%" stopColor="#23C6C8"/><stop offset="50%" stopColor="#6B3FA0"/><stop offset="100%" stopColor="#8B2FC0"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="url(#cg3)"/><text x="24" y="31" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold" fontStyle="italic" fontFamily="Georgia,serif">Canva</text></svg>
                    ) : (
                      <Upload className="w-7 h-7" style={{ color: theme.colors.primary }} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-base">
                      {activeSource === 'capcut' ? 'Enviar v\u00eddeo do CapCut' :
                       activeSource === 'inshot' ? 'Enviar v\u00eddeo do InShot' :
                       activeSource === 'canva' ? 'Enviar m\u00eddia do Canva' :
                       'Arraste ou clique para enviar'}
                    </p>
                    <p className="text-xs opacity-40 mt-1">
                      {activeSource !== 'all'
                        ? `Exporte do ${activeSource === 'capcut' ? 'CapCut' : activeSource === 'inshot' ? 'InShot' : 'Canva'} e envie aqui \u2022 At\u00e9 100MB`
                        : 'MP4, MOV, JPG, PNG, WebP \u2022 At\u00e9 100MB'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Gallery */}
          {media.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm opacity-60">Biblioteca ({media.length})</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                {media.map(m => (
                  <div
                    key={m.id}
                    onClick={() => { setSelectedMedia(m); setAnalysis(null); }}
                    className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 group aspect-square
                      ${selectedMedia?.id === m.id ? 'ring-2 scale-[1.02]' : 'hover:scale-[1.02] opacity-70 hover:opacity-100'}`}
                    style={selectedMedia?.id === m.id ? { boxShadow: `0 0 0 2px ${theme.colors.primary}` } : {}}
                  >
                    {m.type === 'video' ? (
                      <div className="w-full h-full bg-black/30 flex items-center justify-center">
                        <FileVideo className="w-8 h-8 opacity-40" />
                      </div>
                    ) : (
                      <img
                        src={`/grayart/api/media/file/${m.id}`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase opacity-60">
                        {m.type === 'video' ? <Film className="w-3 h-3 inline" /> : <Image className="w-3 h-3 inline" />}
                        {' '}{m.format} \u2022 {formatFileSize(m.size)}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(m.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                    {selectedMedia?.id === m.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.colors.primary }}>
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Analysis + Preview */}
        <div className="flex flex-col gap-4">
          {selectedMedia ? (
            <>
              {/* Preview */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm">M\u00eddia Selecionada</h3>
                  <span className="text-[10px] opacity-40 font-bold uppercase">
                    {selectedMedia.type} \u2022 {selectedMedia.format} \u2022 {formatFileSize(selectedMedia.size)}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden bg-black/20 max-h-[300px] flex items-center justify-center">
                  {selectedMedia.type === 'video' ? (
                    <video
                      src={`/grayart/api/media/file/${selectedMedia.id}`}
                      controls
                      className="max-h-[300px] w-full"
                    />
                  ) : (
                    <img
                      src={`/grayart/api/media/file/${selectedMedia.id}`}
                      alt=""
                      className="max-h-[300px] object-contain"
                    />
                  )}
                </div>
              </Card>

              {/* Platform Selector + Analyze */}
              <Card>
                <h3 className="font-bold text-sm mb-3">Gerar Legenda com IA</h3>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                        ${selectedPlatform === p.id
                          ? 'text-black shadow-sm'
                          : 'bg-white/5 opacity-50 hover:opacity-100'}`}
                      style={selectedPlatform === p.id ? { backgroundColor: theme.colors.primary } : {}}
                    >
                      <PlatformIcon platformId={p.id} size={14} />
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full py-3 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisando com Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar Legenda para {PLATFORMS.find(p => p.id === selectedPlatform)?.label}
                    </>
                  )}
                </button>
              </Card>

              {/* Analysis Result */}
              {analysis && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm">Legenda Gerada</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyText}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 transition-all"
                      >
                        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/5">
                      <span className="text-[10px] font-bold uppercase opacity-30 block mb-1">Hook</span>
                      <p className="font-bold text-sm">{analysis.hook}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                      <span className="text-[10px] font-bold uppercase opacity-30 block mb-1">Corpo</span>
                      <p className="text-sm whitespace-pre-line">{analysis.body}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5">
                      <span className="text-[10px] font-bold uppercase opacity-30 block mb-1">CTA</span>
                      <p className="font-bold text-sm">{analysis.cta}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold"
                          style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-2 text-[10px] font-bold opacity-30 uppercase">
                      <span>Formato: {analysis.suggestedFormat}</span>
                      <span>Mood: {analysis.mood}</span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <div className="text-center py-16 opacity-30">
                <Upload className="w-12 h-12 mx-auto mb-3" />
                <p className="font-bold">Envie uma m\u00eddia para come\u00e7ar</p>
                <p className="text-xs mt-1">A IA vai analisar e gerar a legenda perfeita</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaUpload;

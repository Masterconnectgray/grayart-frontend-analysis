import React, { useState, useRef } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { Card } from '../design-system';
import { bffUpload } from '../services/BFFClient';
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  ImagePlus,
  Sparkles,
  X,
} from 'lucide-react';

interface PhotoAnalyzerProps {
  division: Division;
}

interface ReportItem {
  area: string;
  priority: 'essencial' | 'recomendado' | 'opcional';
  issue: string;
  technique: string;
  details: string;
}

interface PhotoReport {
  score: number;
  items: ReportItem[];
  overall: string;
  ready_to_publish: boolean;
}

interface AnalysisResult {
  report: PhotoReport;
  detection_raw: string;
  model_vision: string;
  model_analysis: string;
  tokens_used: number | null;
}

const PRIORITY_CONFIG = {
  essencial: {
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    badge: 'bg-red-500',
    label: 'ESSENCIAL',
    icon: AlertTriangle,
  },
  recomendado: {
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    badge: 'bg-amber-500',
    label: 'RECOMENDADO',
    icon: Info,
  },
  opcional: {
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    badge: 'bg-blue-500',
    label: 'OPCIONAL',
    icon: Info,
  },
};

const PhotoAnalyzer: React.FC<PhotoAnalyzerProps> = ({ division }) => {
  const theme = DIVISIONS[division];
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem');
      return;
    }

    setImageFile(file);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await bffUpload('/ai-service/analyze-photo', formData);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na análise');
      }

      setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar foto');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 5) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card variant="elevated" title="Análise de Foto com IA" subtitle="MoonDream3 + Gemini — Laudo automático de retoque">
        <div className="space-y-4">
          {!imagePreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/20 rounded-xl p-12 flex flex-col items-center gap-3 hover:border-white/40 transition-colors cursor-pointer"
            >
              <ImagePlus size={48} className="text-white/40" />
              <span className="text-white/60 text-sm">Clique para selecionar uma foto</span>
              <span className="text-white/30 text-xs">JPG, PNG, WebP — max 10MB</span>
            </button>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-xl"
              />
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {imageFile && !analyzing && (
            <button
              type="button"
              onClick={handleAnalyze}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:brightness-110"
              style={{ background: theme.colors.primary }}
            >
              <Sparkles size={18} />
              Analisar Foto
            </button>
          )}

          {analyzing && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 size={24} className="animate-spin" style={{ color: theme.colors.primary }} />
              <div>
                <p className="text-sm font-medium">Analisando com MoonDream3 + Gemini...</p>
                <p className="text-xs text-white/40">Detectando pontos e gerando laudo</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Resultado — Laudo de Retoque */}
      {result && (
        <>
          {/* Score + Status */}
          <Card variant="elevated">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${scoreColor(result.report.score)}`}>
                  {result.report.score}/10
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {result.report.ready_to_publish ? 'Pronta para publicar' : 'Ajustes recomendados'}
                  </p>
                  <p className="text-xs text-white/40">{result.report.overall}</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${result.report.ready_to_publish ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {result.report.ready_to_publish ? (
                  <span className="flex items-center gap-1"><CheckCircle size={12} /> APROVADA</span>
                ) : (
                  <span className="flex items-center gap-1"><AlertTriangle size={12} /> REVISAR</span>
                )}
              </div>
            </div>
          </Card>

          {/* Itens do Laudo */}
          <div className="space-y-3">
            {result.report.items.map((item, idx) => {
              const config = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.opcional;
              return (
                <Card key={idx} variant="default" padding="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${config.badge}`}>
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm">{item.area}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-white/70">{item.issue}</p>
                    <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Camera size={14} className="text-white/40" />
                      <span className="text-xs text-white/50">{item.technique}</span>
                    </div>
                    {item.details && (
                      <p className="text-xs text-white/40">{item.details}</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-white/30 px-1">
            <span>Visão: {result.model_vision} | Análise: {result.model_analysis}</span>
            {result.tokens_used && <span>{result.tokens_used} tokens</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default PhotoAnalyzer;

import React, { useState, useEffect, useRef } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import { Card } from '../design-system';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Brush,
} from 'recharts';

interface SocialAnalyticsProps { division: Division; }
interface TooltipPayload { name: string; value: number; color: string; }
interface CustomTooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; isDark: boolean; }
type ChartType = 'area' | 'bar' | 'line';
const PIE_COLORS = ['#9370DB', '#7c3aed', '#c084fc', '#4f46e5', '#22c55e', '#3b82f6'];

function useAnimatedCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] text-xs border ${isDark ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-black/10'}`}>
      <div className="font-extrabold mb-2 opacity-60">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="opacity-70">{p.name}:</span>
          <span className="font-black" style={{ color: p.color }}>
            {typeof p.value === 'number' && p.name?.toLowerCase().includes('%') ? `${p.value}%` : p.value.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
};

const MONTHLY_DATA: Record<Division, { month: string; alcance: number; engajamento: number; seguidores: number; impressoes: number; salvamentos: number; compartilhamentos: number }[]> = {
  'connect-gray': [
    { month: 'Set', alcance: 8200, engajamento: 3.8, seguidores: 1240, impressoes: 12300, salvamentos: 180, compartilhamentos: 95 },
    { month: 'Out', alcance: 11500, engajamento: 4.1, seguidores: 1580, impressoes: 17250, salvamentos: 245, compartilhamentos: 132 },
    { month: 'Nov', alcance: 9800, engajamento: 4.4, seguidores: 1820, impressoes: 14700, salvamentos: 210, compartilhamentos: 118 },
    { month: 'Dez', alcance: 14200, engajamento: 4.9, seguidores: 2150, impressoes: 21300, salvamentos: 320, compartilhamentos: 178 },
    { month: 'Jan', alcance: 18500, engajamento: 5.1, seguidores: 2680, impressoes: 27750, salvamentos: 410, compartilhamentos: 225 },
    { month: 'Fev', alcance: 22400, engajamento: 5.3, seguidores: 3120, impressoes: 33600, salvamentos: 490, compartilhamentos: 268 },
    { month: 'Mar', alcance: 28900, engajamento: 5.8, seguidores: 3790, impressoes: 43350, salvamentos: 620, compartilhamentos: 345 },
  ],
  'gray-up': [
    { month: 'Set', alcance: 4500, engajamento: 2.9, seguidores: 680, impressoes: 6750, salvamentos: 85, compartilhamentos: 42 },
    { month: 'Out', alcance: 6100, engajamento: 3.2, seguidores: 820, impressoes: 9150, salvamentos: 112, compartilhamentos: 58 },
    { month: 'Nov', alcance: 7200, engajamento: 3.5, seguidores: 950, impressoes: 10800, salvamentos: 138, compartilhamentos: 72 },
    { month: 'Dez', alcance: 8900, engajamento: 3.8, seguidores: 1100, impressoes: 13350, salvamentos: 165, compartilhamentos: 88 },
    { month: 'Jan', alcance: 11200, engajamento: 4.0, seguidores: 1380, impressoes: 16800, salvamentos: 210, compartilhamentos: 112 },
    { month: 'Fev', alcance: 13500, engajamento: 4.3, seguidores: 1620, impressoes: 20250, salvamentos: 252, compartilhamentos: 135 },
    { month: 'Mar', alcance: 16800, engajamento: 4.7, seguidores: 1950, impressoes: 25200, salvamentos: 318, compartilhamentos: 168 },
  ],
  'gray-up-flow': [
    { month: 'Set', alcance: 3200, engajamento: 4.2, seguidores: 450, impressoes: 4800, salvamentos: 92, compartilhamentos: 65 },
    { month: 'Out', alcance: 4100, engajamento: 4.8, seguidores: 560, impressoes: 6150, salvamentos: 118, compartilhamentos: 82 },
    { month: 'Nov', alcance: 5500, engajamento: 5.1, seguidores: 720, impressoes: 8250, salvamentos: 155, compartilhamentos: 108 },
    { month: 'Dez', alcance: 6800, engajamento: 5.4, seguidores: 880, impressoes: 10200, salvamentos: 192, compartilhamentos: 132 },
    { month: 'Jan', alcance: 8400, engajamento: 5.9, seguidores: 1050, impressoes: 12600, salvamentos: 238, compartilhamentos: 165 },
    { month: 'Fev', alcance: 10200, engajamento: 6.2, seguidores: 1240, impressoes: 15300, salvamentos: 288, compartilhamentos: 198 },
    { month: 'Mar', alcance: 12800, engajamento: 6.8, seguidores: 1520, impressoes: 19200, salvamentos: 362, compartilhamentos: 248 },
  ],
  'gray-art': [
    { month: 'Set', alcance: 15000, engajamento: 5.1, seguidores: 2100, impressoes: 22500, salvamentos: 420, compartilhamentos: 195 },
    { month: 'Out', alcance: 19500, engajamento: 5.5, seguidores: 2650, impressoes: 29250, salvamentos: 545, compartilhamentos: 252 },
    { month: 'Nov', alcance: 24000, engajamento: 5.8, seguidores: 3200, impressoes: 36000, salvamentos: 670, compartilhamentos: 312 },
    { month: 'Dez', alcance: 28500, engajamento: 6.1, seguidores: 3850, impressoes: 42750, salvamentos: 795, compartilhamentos: 370 },
    { month: 'Jan', alcance: 33000, engajamento: 6.4, seguidores: 4500, impressoes: 49500, salvamentos: 920, compartilhamentos: 428 },
    { month: 'Fev', alcance: 41000, engajamento: 6.7, seguidores: 5300, impressoes: 61500, salvamentos: 1150, compartilhamentos: 532 },
    { month: 'Mar', alcance: 52000, engajamento: 7.1, seguidores: 6400, impressoes: 78000, salvamentos: 1450, compartilhamentos: 675 },
  ],
};

const CONTENT_BREAKDOWN: Record<Division, { tipo: string; alcance: number; eng: number }[]> = {
  'connect-gray': [
    { tipo: 'Reels', alcance: 12500, eng: 5.2 },
    { tipo: 'Carrossel', alcance: 8300, eng: 4.8 },
    { tipo: 'Post', alcance: 5200, eng: 3.1 },
    { tipo: 'Stories', alcance: 9800, eng: 2.1 },
  ],
  'gray-up': [
    { tipo: 'Reels', alcance: 9200, eng: 3.8 },
    { tipo: 'Carrossel', alcance: 7500, eng: 4.5 },
    { tipo: 'Post', alcance: 4100, eng: 2.9 },
    { tipo: 'Stories', alcance: 6200, eng: 1.8 },
  ],
  'gray-up-flow': [
    { tipo: 'Reels', alcance: 5800, eng: 6.2 },
    { tipo: 'Carrossel', alcance: 4200, eng: 5.1 },
    { tipo: 'Post', alcance: 2900, eng: 4.2 },
    { tipo: 'Stories', alcance: 3100, eng: 2.4 },
  ],
  'gray-art': [
    { tipo: 'Reels', alcance: 22100, eng: 6.8 },
    { tipo: 'Carrossel', alcance: 15400, eng: 5.9 },
    { tipo: 'Post', alcance: 8200, eng: 4.1 },
    { tipo: 'Stories', alcance: 12500, eng: 2.8 },
  ],
};

const AUDIENCE_DATA: Record<Division, { name: string; value: number }[]> = {
  'connect-gray': [
    { name: 'Sindicos', value: 42 },
    { name: 'Gestores', value: 28 },
    { name: 'Fornecedores', value: 18 },
    { name: 'Outros', value: 12 },
  ],
  'gray-up': [
    { name: 'Sindicos', value: 35 },
    { name: 'Construtoras', value: 25 },
    { name: 'Engenheiros', value: 22 },
    { name: 'Outros', value: 18 },
  ],
  'gray-up-flow': [
    { name: 'Empresarios', value: 48 },
    { name: 'Gerentes', value: 28 },
    { name: 'Engenheiros', value: 15 },
    { name: 'Outros', value: 9 },
  ],
  'gray-art': [
    { name: 'Empreendedores', value: 38 },
    { name: 'Marketing', value: 25 },
    { name: 'Designers', value: 22 },
    { name: 'Outros', value: 15 },
  ],
};

const TIPS_DATA: Record<Division, { title: string; detail: string; status: 'optimal' | 'warning' | 'critical' }[]> = {
  'connect-gray': [
    { title: 'Formato Ideal', detail: 'Reels de 15-30s com depoimentos reais do Coffee Meet.', status: 'optimal' },
    { title: 'Frequência', detail: '3 Reels + 2 Posts por semana - manter consistência.', status: 'optimal' },
    { title: 'Hashtags', detail: 'Use #sindicoprofissional #gestaopredial - adicione geolocalizadas.', status: 'warning' },
  ],
  'gray-up': [
    { title: 'Conteudo Antes/Depois', detail: 'Modernizacoes com antes/depois geram alto salvamento.', status: 'optimal' },
    { title: 'Videos de Obra', detail: 'Time-lapse de obras performam 3x mais que posts estaticos.', status: 'optimal' },
    { title: 'LinkedIn', detail: 'Replicar conteudo tecnico no LinkedIn - publico B2B presente.', status: 'warning' },
  ],
  'gray-up-flow': [
    { title: 'Cases com Números', detail: 'Resultados com % geram 4x mais compartilhamentos.', status: 'optimal' },
    { title: 'LinkedIn Urgente', detail: 'Publico B2B no LinkedIn precisa de atencao imediata.', status: 'critical' },
    { title: 'Frequência', detail: '2x semana minimo para manter algoritmo ativo.', status: 'warning' },
  ],
  'gray-art': [
    { title: 'Reels Criativos', detail: 'Processo criativo em time-lapse gera alto engajamento.', status: 'optimal' },
    { title: 'X (Twitter)', detail: 'Presença no X para alcance orgânico e threads virais.', status: 'warning' },
    { title: 'Stories Diários', detail: 'Stories diarios aumentam visibilidade em 22% no feed.', status: 'optimal' },
  ],
};
const KPICard: React.FC<{
  label: string;
  rawValue: number;
  trend: string;
  trendValue: number;
  borderColorClass: string;
  textColorClass: string;
}> = ({ label, rawValue, trend, trendValue, borderColorClass }) => {
  const animated = useAnimatedCounter(rawValue);
  const isPercent = label.toLowerCase().includes('engajamento');

  return (
    <Card className={`border-b-4 ${borderColorClass} !p-5 md:!p-6`}>
      <h4 className="opacity-40 text-[10px] font-black mb-2 uppercase tracking-widest">{label}</h4>
      <div className="text-3xl font-black leading-none mb-2">
        {isPercent ? `${(animated / 10).toFixed(1)}%` : animated.toLocaleString('pt-BR')}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-black inline-flex items-center gap-1 ${trendValue >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          <span className="text-[10px]">{trendValue >= 0 ? '▲' : '▼'}</span>
          {trend}
        </span>
        <span className="opacity-30 font-bold text-[10px] tracking-wide">vs mês anterior</span>
      </div>
    </Card>
  );
};

const ChartToggle: React.FC<{ current: ChartType; onChange: (t: ChartType) => void; isDark: boolean }> = ({ current, onChange, isDark }) => {
  const options: { key: ChartType; label: string }[] = [
    { key: 'area', label: 'Área' },
    { key: 'bar', label: 'Barras' },
    { key: 'line', label: 'Linha' },
  ];
  return (
    <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-[#333]' : 'bg-slate-200'}`}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all
          ${current === o.key ? (isDark ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-black shadow-sm') : 'bg-transparent text-slate-400'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
};

const SocialAnalytics: React.FC<SocialAnalyticsProps> = ({ division }) => {
  useAppContext();
  const isDark = division !== 'gray-art';
  const theme = DIVISIONS[division];

  const [activeSection, setActiveSection] = useState<'overview' | 'content' | 'audience'>('overview');
  const [chartType, setChartType] = useState<ChartType>('area');

  const animKey = `${division}-${activeSection}`;

  const monthly = MONTHLY_DATA[division];
  const lastMonth = monthly[monthly.length - 1];
  const prevMonth = monthly[monthly.length - 2];
  const growthAlcance = Math.round(((lastMonth.alcance - prevMonth.alcance) / prevMonth.alcance) * 100);
  const growthSeg = Math.round(((lastMonth.seguidores - prevMonth.seguidores) / prevMonth.seguidores) * 100);
  const growthEng = +((lastMonth.engajamento - prevMonth.engajamento).toFixed(1));
  const growthImp = Math.round(((lastMonth.impressoes - prevMonth.impressoes) / prevMonth.impressoes) * 100);

  const gridColor = isDark ? '#333' : '#eee';
  const axisColor = isDark ? '#666' : '#aaa';

  const metrics = [
    { label: 'Alcance Mensal', rawValue: lastMonth.alcance, trend: `+${growthAlcance}%`, trendValue: growthAlcance, borderColorClass: 'border-[var(--primary-color)]', textColorClass: 'text-[var(--primary-color)]' },
    { label: 'Taxa Engajamento', rawValue: Math.round(lastMonth.engajamento * 10), trend: `+${growthEng}pp`, trendValue: growthEng, borderColorClass: 'border-emerald-500', textColorClass: 'text-emerald-500' },
    { label: 'Seguidores', rawValue: lastMonth.seguidores, trend: `+${growthSeg}%`, trendValue: growthSeg, borderColorClass: 'border-amber-500', textColorClass: 'text-amber-500' },
    { label: 'Impressões', rawValue: lastMonth.impressoes, trend: `+${growthImp}%`, trendValue: growthImp, borderColorClass: 'border-blue-500', textColorClass: 'text-blue-500' },
  ];

  const renderMainChart = () => {
    const commonProps = { data: monthly };
    const xAxis = <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />;
    const yAxis = <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />;
    const grid = <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />;
    const tt = <Tooltip content={<CustomTooltip isDark={isDark} />} />;
    const brush = <Brush dataKey="month" height={20} stroke={theme.colors.primary} fill={isDark ? '#1a1a2e' : '#f9f9f9'} travellerWidth={8} />;

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart {...commonProps}>
            {grid}{xAxis}{yAxis}{tt}
            <Bar dataKey="alcance" name="Alcance" fill={theme.colors.primary} radius={[6, 6, 0, 0]} opacity={0.9} />
            <Bar dataKey="seguidores" name="Seguidores" fill="#22c55e" radius={[6, 6, 0, 0]} opacity={0.7} />
            {brush}
          </BarChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart {...commonProps}>
            {grid}{xAxis}{yAxis}{tt}
            <Line type="monotone" dataKey="alcance" name="Alcance" stroke={theme.colors.primary} strokeWidth={2.5} dot={{ fill: theme.colors.primary, r: 4 }} activeDot={{ r: 6, fill: theme.colors.primary }} />
            <Line type="monotone" dataKey="seguidores" name="Seguidores" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} strokeDasharray="4 2" />
            {brush}
          </LineChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="gradAlcance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.colors.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={theme.colors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          {grid}{xAxis}{yAxis}{tt}
          <Area type="monotone" dataKey="alcance" name="Alcance" stroke={theme.colors.primary} strokeWidth={2.5} fill="url(#gradAlcance)" dot={{ fill: theme.colors.primary, strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: theme.colors.primary }} />
          <Area type="monotone" dataKey="seguidores" name="Seguidores" stroke="#22c55e" strokeWidth={2} fill="none" strokeDasharray="4 2" dot={false} />
          {brush}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((s, i) => (
          <KPICard
            key={i}
            label={s.label}
            rawValue={s.rawValue}
            trend={s.trend}
            trendValue={s.trendValue}
            borderColorClass={s.borderColorClass}
            textColorClass={s.textColorClass}
          />
        ))}
      </div>

      <div className="flex gap-2 mb-6 bg-[var(--sub-bg)] p-1.5 rounded-xl w-fit overflow-x-auto max-w-full">
        {(['overview', 'content', 'audience'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSection(tab)} className={`px-5 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap transition-all duration-300
            ${activeSection === tab ? 'bg-[var(--primary-color)] text-[var(--card-bg)] shadow-md' : 'text-slate-400 hover:text-[var(--card-text)]'}`}>
            {tab === 'overview' ? 'CRESCIMENTO' : tab === 'content' ? 'CONTEÚDO' : 'PÚBLICO'}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 grid gap-6" key={`ov-${animKey}`}>
          <Card>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="font-black text-sm opacity-70 tracking-widest m-0 uppercase">Alcance Orgânico - Últimos 7 Meses</h3>
              <ChartToggle current={chartType} onChange={setChartType} isDark={isDark} />
            </div>
            {renderMainChart()}
            <div className="flex flex-wrap gap-6 mt-6 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 rounded-full bg-[var(--primary-color)]" />
                <span className="text-xs font-bold opacity-60">Alcance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 rounded-full bg-emerald-500 opacity-80" />
                <span className="text-xs font-bold opacity-60">Seguidores</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-black text-xs mb-6 opacity-70 tracking-widest uppercase">Taxa de Engajamento (%)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit="%" />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Line type="monotone" dataKey="engajamento" name="Engajamento %" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-black text-xs mb-5 opacity-70 tracking-widest uppercase">Diagnóstico IA</h3>
              <div className="flex flex-col gap-3">
                {TIPS_DATA[division].map((tip, i) => {
                  const statusColors = {
                    optimal: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
                    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
                    critical: 'bg-red-500/10 border-red-500/30 text-red-500',
                  }[tip.status];
                  return (
                    <div key={i} className={`p-4 rounded-xl border border-l-4 ${statusColors}`}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-black text-xs truncate max-w-[70%]">{tip.title}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider">{tip.status}</span>
                      </div>
                      <div className="text-xs opacity-80 leading-relaxed font-medium">{tip.detail}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-black text-xs mb-6 opacity-70 tracking-widest uppercase">Salvamentos & Compartilhamentos</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Bar dataKey="salvamentos" name="Salvamentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="compartilhamentos" name="Compartilhamentos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="font-black text-xs mb-6 opacity-70 tracking-widest uppercase">Impressões Totais</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="gradImp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Area type="monotone" dataKey="impressoes" name="Impressões" stroke="#3b82f6" strokeWidth={2} fill="url(#gradImp)" dot={{ fill: '#3b82f6', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}

      {activeSection === 'content' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 grid grid-cols-1 lg:grid-cols-2 gap-6" key={`ct-${animKey}`}>
          <Card>
            <h3 className="font-black text-xs mb-6 opacity-70 tracking-widest uppercase">Alcance por Formato</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={CONTENT_BREAKDOWN[division]} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="tipo" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="alcance" name="Alcance" radius={[6, 6, 0, 0]}>
                  {CONTENT_BREAKDOWN[division].map((_, index) => (
                    <Cell key={index} fill={index === 0 ? theme.colors.primary : `${theme.colors.primary}${['99', '66', '44', '33'][index] || '33'}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h3 className="font-black text-xs mb-6 opacity-70 tracking-widest uppercase">Engajamento por Formato (%)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={CONTENT_BREAKDOWN[division]} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 'auto']} />
                <YAxis type="category" dataKey="tipo" tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="eng" name="Engajamento %" radius={[0, 6, 6, 0]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {activeSection === 'audience' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6" key={`au-${animKey}`}>
          <Card>
            <h3 className="font-black text-xs mb-6 opacity-70 tracking-widest uppercase">Composição do Público</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={AUDIENCE_DATA[division]} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" paddingAngle={3} label={({ value }) => `${value}%`} labelLine={false}>
                  {AUDIENCE_DATA[division].map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-6 justify-center">
              {AUDIENCE_DATA[division].map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-bold">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="opacity-70">{d.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-black text-xs mb-6 opacity-70 tracking-widest uppercase">Segmentos Detalhados</h3>
            <div className="flex flex-col gap-6">
              {AUDIENCE_DATA[division].map((seg, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm">{seg.name}</span>
                    <span className="font-black text-sm" style={{ color: PIE_COLORS[i] }}>{seg.value}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden bg-[var(--sub-bg)]">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${seg.value}%`, background: `linear-gradient(90deg, ${PIE_COLORS[i]}, ${PIE_COLORS[i]}cc)` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-5 rounded-xl bg-[var(--sub-bg)]">
              <div className="text-[10px] font-black opacity-40 mb-3 uppercase tracking-widest">Melhores Horários para Postar</div>
              <div className="flex gap-3 flex-wrap">
                {(division === 'connect-gray'
                  ? ['12:00', '18:30', '21:00']
                  : division === 'gray-up' ? ['07:30', '12:00', '19:00']
                    : division === 'gray-up-flow' ? ['08:00', '12:30', '20:00']
                      : ['10:00', '14:00', '21:30']
                ).map((t, i) => (
                  <span key={i} className="px-4 py-2 rounded-lg bg-[var(--primary-color)] text-[var(--card-bg)] font-black text-sm shadow-md">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SocialAnalytics;

import React, { useState, useEffect, useRef } from 'react';
import type { Division } from '../constants/Themes';
import { DIVISIONS } from '../constants/Themes';
import { useAppContext } from '../context/AppContext';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Brush,
} from 'recharts';


interface SocialAnalyticsProps { division: Division; }

interface TooltipPayload { name: string; value: number; color: string; }
interface CustomTooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: string; isDark: boolean; }

type ChartType = 'area' | 'bar' | 'line';

// ── Animated Counter Hook ───────────────────────────────────────────────────
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

// ── Tooltip customizado ─────────────────────────────────────────────────────
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: isDark ? '#1a1a2e' : '#fff',
      border: `1px solid rgba(255,255,255,0.1)`,
      borderRadius: '12px', padding: '0.8rem 1rem',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      fontSize: '0.78rem', fontFamily: 'inherit',
    }}>
      <div style={{ fontWeight: 800, marginBottom: '0.5rem', opacity: 0.6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
          <span style={{ opacity: 0.7 }}>{p.name}:</span>
          <span style={{ fontWeight: 900, color: p.color }}>
            {typeof p.value === 'number' && p.name?.toLowerCase().includes('%') ? `${p.value}%` : p.value.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Dados por divisao (realistas, com sazonalidade) ─────────────────────────
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
    { title: 'Frequencia', detail: '3 Reels + 2 Posts por semana - manter consistencia.', status: 'optimal' },
    { title: 'Hashtags', detail: 'Use #sindicoprofissional #gestaopredial - adicione geolocalizadas.', status: 'warning' },
  ],
  'gray-up': [
    { title: 'Conteudo Antes/Depois', detail: 'Modernizacoes com antes/depois geram alto salvamento.', status: 'optimal' },
    { title: 'Videos de Obra', detail: 'Time-lapse de obras performam 3x mais que posts estaticos.', status: 'optimal' },
    { title: 'LinkedIn', detail: 'Replicar conteudo tecnico no LinkedIn - publico B2B presente.', status: 'warning' },
  ],
  'gray-up-flow': [
    { title: 'Cases com Numeros', detail: 'Resultados com % geram 4x mais compartilhamentos.', status: 'optimal' },
    { title: 'LinkedIn Urgente', detail: 'Publico B2B no LinkedIn precisa de atencao imediata.', status: 'critical' },
    { title: 'Frequencia', detail: '2x semana minimo para manter algoritmo ativo.', status: 'warning' },
  ],
  'gray-art': [
    { title: 'Reels Criativos', detail: 'Processo criativo em time-lapse gera alto engajamento.', status: 'optimal' },
    { title: 'Pinterest', detail: 'Portfolio no Pinterest para SEO visual - 40k buscas/mes.', status: 'warning' },
    { title: 'Stories Diarios', detail: 'Stories diarios aumentam visibilidade em 22% no feed.', status: 'optimal' },
  ],
};

const STATUS_COLOR = { optimal: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };
const PIE_COLORS = ['#9370DB', '#7c3aed', '#c084fc', '#4f46e5', '#22c55e', '#3b82f6'];

// ── AnimatedKPI Card ────────────────────────────────────────────────────────
const KPICard: React.FC<{
  label: string;
  rawValue: number;
  formatted: string;
  trend: string;
  trendValue: number;
  color: string;
  cardBg: string;
  cardText: string;
}> = ({ label, rawValue, trend, trendValue, color, cardBg, cardText }) => {
  const animated = useAnimatedCounter(rawValue);
  const isPercent = label.toLowerCase().includes('engajamento');

  return (
    <div className="premium-card" style={{
      backgroundColor: cardBg, color: cardText,
      borderBottom: `4px solid ${color}`, padding: '1.4rem',
    }}>
      <h4 style={{ opacity: 0.4, fontSize: '0.65rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</h4>
      <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>
        {isPercent ? `${(animated / 10).toFixed(1)}%` : animated.toLocaleString('pt-BR')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 800,
          color: trendValue >= 0 ? '#22c55e' : '#ef4444',
          display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
        }}>
          <span style={{ fontSize: '0.6rem' }}>{trendValue >= 0 ? '\u25B2' : '\u25BC'}</span>
          {trend}
        </span>
        <span style={{ opacity: 0.3, fontWeight: 700, fontSize: '0.7rem' }}>vs mes anterior</span>
      </div>
    </div>
  );
};

// ── Chart Type Toggle ───────────────────────────────────────────────────────
const ChartToggle: React.FC<{ current: ChartType; onChange: (t: ChartType) => void; isDark: boolean }> = ({ current, onChange, isDark }) => {
  const options: { key: ChartType; label: string }[] = [
    { key: 'area', label: 'Area' },
    { key: 'bar', label: 'Barras' },
    { key: 'line', label: 'Linha' },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.3rem', background: isDark ? '#333' : '#eee', padding: '0.2rem', borderRadius: '8px' }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '0.3rem 0.7rem', borderRadius: '6px', cursor: 'pointer',
          fontSize: '0.65rem', fontWeight: 800, border: 'none',
          backgroundColor: current === o.key ? (isDark ? '#555' : '#fff') : 'transparent',
          color: current === o.key ? (isDark ? '#fff' : '#000') : (isDark ? '#888' : '#999'),
          transition: 'all 0.2s',
        }}>{o.label}</button>
      ))}
    </div>
  );
};

// ── Componente Principal ────────────────────────────────────────────────────
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

  const cardBg = isDark ? '#1e1e1e' : '#fff';
  const subBg = isDark ? '#2d2d2d' : '#f0f2f5';
  const cardText = isDark ? '#fff' : '#1a1a1a';
  const gridColor = isDark ? '#333' : '#eee';
  const axisColor = isDark ? '#666' : '#aaa';

  const metrics = [
    { label: 'Alcance Mensal', rawValue: lastMonth.alcance, formatted: lastMonth.alcance.toLocaleString('pt-BR'), trend: `+${growthAlcance}%`, trendValue: growthAlcance, color: theme.colors.primary },
    { label: 'Taxa Engajamento', rawValue: Math.round(lastMonth.engajamento * 10), formatted: `${lastMonth.engajamento}%`, trend: `+${growthEng}pp`, trendValue: growthEng, color: '#22c55e' },
    { label: 'Seguidores', rawValue: lastMonth.seguidores, formatted: lastMonth.seguidores.toLocaleString('pt-BR'), trend: `+${growthSeg}%`, trendValue: growthSeg, color: '#f59e0b' },
    { label: 'Impressoes', rawValue: lastMonth.impressoes, formatted: lastMonth.impressoes.toLocaleString('pt-BR'), trend: `+${growthImp}%`, trendValue: growthImp, color: '#3b82f6' },
  ];

  // render the main chart based on chartType toggle
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
    // default: area
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
    <div className="animate-fade-in" style={{ color: cardText }}>
      {/* ── Metric Cards (animated counters + variation) ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {metrics.map((s, i) => (
          <KPICard
            key={i}
            label={s.label}
            rawValue={s.rawValue}
            formatted={s.formatted}
            trend={s.trend}
            trendValue={s.trendValue}
            color={s.color}
            cardBg={cardBg}
            cardText={cardText}
          />
        ))}
      </div>

      {/* ── Tab Nav ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: subBg, padding: '0.3rem', borderRadius: '12px', width: 'fit-content' }}>
        {(['overview', 'content', 'audience'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSection(tab)} style={{
            padding: '0.6rem 1.2rem', borderRadius: '10px', cursor: 'pointer', border: 'none',
            backgroundColor: activeSection === tab ? theme.colors.primary : 'transparent',
            color: activeSection === tab ? (isDark ? '#fff' : '#000') : (isDark ? '#555' : '#999'),
            fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.3s',
          }}>
            {tab === 'overview' ? 'CRESCIMENTO' : tab === 'content' ? 'CONTEUDO' : 'PUBLICO'}
          </button>
        ))}
      </div>

      {/* ── Overview: Area/Bar/Line + Engajamento ────────────────────── */}
      {activeSection === 'overview' && (
        <div className="animate-fade-in" key={`ov-${animKey}`} style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', opacity: 0.7, letterSpacing: '1px', margin: 0 }}>
                ALCANCE ORGANICO - ULTIMOS 7 MESES
              </h3>
              <ChartToggle current={chartType} onChange={setChartType} isDark={isDark} />
            </div>
            {renderMainChart()}
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '3px', background: theme.colors.primary, borderRadius: '2px' }} />
                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Alcance</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '3px', background: '#22c55e', borderRadius: '2px', opacity: 0.7 }} />
                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Seguidores</span>
              </div>
            </div>
          </div>

          {/* Engajamento + Dicas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.7, letterSpacing: '1px' }}>
                TAXA DE ENGAJAMENTO (%)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit="%" />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Line type="monotone" dataKey="engajamento" name="Engajamento %" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.2rem', opacity: 0.7, letterSpacing: '1px' }}>DIAGNOSTICO IA</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {TIPS_DATA[division].map((tip, i) => (
                  <div key={i} style={{ padding: '0.8rem', borderRadius: '12px', background: subBg, borderLeft: `4px solid ${STATUS_COLOR[tip.status]}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{tip.title}</span>
                      <span style={{ fontSize: '0.55rem', fontWeight: 900, padding: '0.15rem 0.4rem', borderRadius: '4px', background: `${STATUS_COLOR[tip.status]}20`, color: STATUS_COLOR[tip.status] }}>{tip.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.6, lineHeight: 1.4 }}>{tip.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extra metrics row: Salvamentos, Compartilhamentos, Impressoes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.7, letterSpacing: '1px' }}>
                SALVAMENTOS & COMPARTILHAMENTOS
              </h3>
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
            </div>

            <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.7, letterSpacing: '1px' }}>
                IMPRESSOES TOTAIS
              </h3>
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
                  <Area type="monotone" dataKey="impressoes" name="Impressoes" stroke="#3b82f6" strokeWidth={2} fill="url(#gradImp)" dot={{ fill: '#3b82f6', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Content: Bar Chart ──────────────────────────────────────── */}
      {activeSection === 'content' && (
        <div className="animate-fade-in" key={`ct-${animKey}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.7 }}>ALCANCE POR FORMATO</h3>
            <ResponsiveContainer width="100%" height={240}>
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
          </div>

          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.7 }}>ENGAJAMENTO POR FORMATO (%)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={CONTENT_BREAKDOWN[division]} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 'auto']} />
                <YAxis type="category" dataKey="tipo" tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<CustomTooltip isDark={isDark} />} />
                <Bar dataKey="eng" name="Engajamento %" radius={[0, 6, 6, 0]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Audience: Pie + Bars ────────────────────────────────────── */}
      {activeSection === 'audience' && (
        <div className="animate-fade-in" key={`au-${animKey}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.7 }}>COMPOSICAO DO PUBLICO</h3>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {AUDIENCE_DATA[division].map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PIE_COLORS[i] }} />
                  <span style={{ opacity: 0.7 }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card" style={{ backgroundColor: cardBg, color: cardText }}>
            <h3 style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '1.2rem', opacity: 0.7 }}>SEGMENTOS DETALHADOS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {AUDIENCE_DATA[division].map((seg, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{seg.name}</span>
                    <span style={{ fontWeight: 900, color: PIE_COLORS[i] }}>{seg.value}%</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: isDark ? '#333' : '#eee', overflow: 'hidden' }}>
                    <div style={{ width: `${seg.value}%`, height: '100%', background: `linear-gradient(90deg, ${PIE_COLORS[i]}, ${PIE_COLORS[i]}88)`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: subBg }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.4, marginBottom: '0.6rem', textTransform: 'uppercase' }}>Melhores Horarios</div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {(division === 'connect-gray'
                  ? ['12:00', '18:30', '21:00']
                  : division === 'gray-up' ? ['07:30', '12:00', '19:00']
                    : division === 'gray-up-flow' ? ['08:00', '12:30', '20:00']
                      : ['10:00', '14:00', '21:30']
                ).map((t, i) => (
                  <span key={i} style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: theme.colors.primary, color: isDark ? '#fff' : '#000', fontWeight: 900, fontSize: '0.9rem' }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialAnalytics;

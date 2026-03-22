import React from 'react';
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string; // Fallback ou base color, se não preferimos a primária global
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon: Icon,
  trend,
  trendValue,
  color = 'var(--primary-color)',
  className = ''
}) => {
  return (
    <Card variant="default" padding="p-5" className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          <h4 className="text-3xl font-bold mt-2 text-white">{value}</h4>
        </div>
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
          {trend === 'up' && <><TrendingUp className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">{trendValue || 'Crescimento'}</span></>}
          {trend === 'down' && <><TrendingDown className="w-4 h-4 text-rose-400" /><span className="text-rose-400">{trendValue || 'Queda'}</span></>}
          {trend === 'neutral' && <><Minus className="w-4 h-4 text-slate-400" /><span className="text-slate-400">{trendValue || 'Estável'}</span></>}
          <span className="text-slate-500 font-normal ml-1">vs. período anterior</span>
        </div>
      )}
    </Card>
  );
};

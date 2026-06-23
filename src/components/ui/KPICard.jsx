import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary', loading = false }) {
  const colorMap = {
    primary: { iconBg: 'bg-primary-50', iconColor: 'text-primary-700', border: 'border-primary-100' },
    red: { iconBg: 'bg-red-50', iconColor: 'text-red-600', border: 'border-red-100' },
    amber: { iconBg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100' },
    green: { iconBg: 'bg-green-50', iconColor: 'text-green-600', border: 'border-green-100' },
    accent: { iconBg: 'bg-teal-50', iconColor: 'text-teal-700', border: 'border-teal-100' },
  };
  const c = colorMap[color] || colorMap.primary;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-slate-400';

  return (
    <div className={`card p-5 hover:shadow-card-hover transition-shadow duration-200`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>
          )}
          {trendValue && (
            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
              <TrendIcon size={12} />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0 ml-3`}>
            <Icon size={18} className={c.iconColor} />
          </div>
        )}
      </div>
    </div>
  );
}

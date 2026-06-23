import React from 'react';
import { getEPSPriority, getEPSColor, getEPSGaugeColor } from '../../services/violationScorer.js';

export default function EPSMeter({ score = 0, size = 'md', showBreakdown = false, breakdown = null }) {
  const priority = getEPSPriority(score);
  const gaugeColor = getEPSGaugeColor(score);
  const { bg, text, border } = getEPSColor(priority);

  const sizes = {
    sm: { r: 28, stroke: 6, fontSize: 14, containerSize: 72 },
    md: { r: 40, stroke: 8, fontSize: 20, containerSize: 100 },
    lg: { r: 56, stroke: 10, fontSize: 26, containerSize: 136 },
  };
  const s = sizes[size] || sizes.md;

  const circumference = 2 * Math.PI * s.r;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dashArray = (clampedScore / 100) * circumference;
  const svgSize = s.containerSize;
  const center = svgSize / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Gauge */}
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          {/* Background track */}
          <circle
            cx={center} cy={center} r={s.r}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={s.stroke}
          />
          {/* Score arc */}
          <circle
            cx={center} cy={center} r={s.r}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={`${dashArray} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: 'stroke-dasharray 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold tabular-nums leading-none" style={{ fontSize: s.fontSize, color: gaugeColor }}>
            {score}
          </span>
          <span className="text-xs text-slate-400 leading-none mt-0.5">EPS</span>
        </div>
      </div>

      {/* Priority Badge */}
      <span
        className="px-3 py-1 rounded-full text-xs font-semibold border"
        style={{ backgroundColor: bg, color: text, borderColor: border }}
      >
        {priority} Priority
      </span>

      {/* Breakdown */}
      {showBreakdown && breakdown && (
        <div className="w-full space-y-1.5 mt-1">
          {[
            { label: 'Severity', value: breakdown.severity, weight: '40%' },
            { label: 'Repeat Score', value: breakdown.repeatScore, weight: '30%' },
            { label: 'Zone Risk', value: breakdown.zoneRisk, weight: '20%' },
            { label: 'Time Risk', value: breakdown.timeRisk, weight: '10%' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-24 flex-shrink-0">{item.label}</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.value}%`, backgroundColor: gaugeColor }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

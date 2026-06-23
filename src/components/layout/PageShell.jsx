import React from 'react';

/**
 * PageShell — shared wrapper for all inner dashboard pages.
 *
 * Provides:
 *  - Consistent dark background (TrafficVision AI design system)
 *  - Subtle grid texture
 *  - Static page header (label → title → subtitle)
 *  - Full min-height to prevent layout jump
 *
 * Usage:
 *   <PageShell label="Detection Center" title="AI Violation Pipeline" subtitle="...">
 *     {children}
 *   </PageShell>
 */
export default function PageShell({
  label,
  title,
  subtitle,
  children,
  headerRight = null,
  accent = false,
}) {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Subtle grid texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className={accent ? 'pl-4 border-l-2 border-blue-500' : ''}>
            {label && (
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#60A5FA' }}
                >
                  {label}
                </span>
              </div>
            )}
            {title && (
              <h1
                className="text-2xl font-bold leading-tight"
                style={{ color: 'hsl(40, 6%, 95%)', fontFamily: 'var(--font-sans)' }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm mt-1 max-w-lg" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && (
            <div className="flex-shrink-0">{headerRight}</div>
          )}
        </div>

        {/* ── Page Content ────────────────────────────────────── */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

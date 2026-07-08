// Widget de dashboard (RFC-003): número grande + rótulo + dica opcional.

import type { ReactNode } from 'react';

interface WidgetCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function WidgetCard({ label, value, hint }: WidgetCardProps) {
  return (
    <div className="widget">
      <span className="widget__value">{value}</span>
      <span className="widget__label">{label}</span>
      {hint && <span className="widget__hint">{hint}</span>}
    </div>
  );
}

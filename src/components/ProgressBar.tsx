import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      )}
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, hsl(var(--primary) / 0.7), hsl(var(--accent) / 0.7))',
          }}
        />
      </div>
    </div>
  );
};
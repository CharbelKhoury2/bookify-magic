import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, description }) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="text-muted-foreground">{icon}</div>
    </div>
    <p className="text-3xl font-bold text-foreground">{value}</p>
    {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
  </div>
);

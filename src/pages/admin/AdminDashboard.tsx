import React from 'react';
import { BookOpen, TrendingUp, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatsCard } from '@/components/admin/StatsCard';
import { useGenerationStats } from '@/hooks/useBookGenerations';
import { format } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const { total, last7, last30, themeChart, recent, isLoading } = useGenerationStats();

  return (
    <div className="space-y-8 max-w-6xl">
      <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Books" value={isLoading ? '...' : total} icon={<BookOpen className="h-5 w-5" />} />
        <StatsCard title="Last 7 Days" value={isLoading ? '...' : last7} icon={<Clock className="h-5 w-5" />} />
        <StatsCard title="Last 30 Days" value={isLoading ? '...' : last30} icon={<Calendar className="h-5 w-5" />} />
      </div>

      {/* Theme popularity chart */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Popular Themes
        </h3>
        {themeChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={themeChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No generation data yet.</p>
        )}
      </div>

      {/* Recent generations */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Generations</h3>
        {recent.length > 0 ? (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Child</th>
                  <th className="pb-2 pr-4">Theme</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((g) => (
                  <tr key={g.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium text-foreground">{g.child_name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{g.theme_name}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === 'completed' ? 'bg-success/20 text-success' : g.status === 'failed' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="py-2 text-muted-foreground">{format(new Date(g.created_at), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No books generated yet.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

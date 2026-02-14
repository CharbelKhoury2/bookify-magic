import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookGeneration {
  id: string;
  user_id: string | null;
  child_name: string;
  theme_id: string;
  theme_name: string;
  created_at: string;
  status: string;
}

export function useBookGenerations() {
  return useQuery({
    queryKey: ['book-generations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_generations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BookGeneration[];
    },
  });
}

export function useGenerationStats() {
  const { data: generations, ...rest } = useBookGenerations();

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const total = generations?.length ?? 0;
  const last7 = generations?.filter((g) => new Date(g.created_at) >= d7).length ?? 0;
  const last30 = generations?.filter((g) => new Date(g.created_at) >= d30).length ?? 0;

  const themeCounts: Record<string, number> = {};
  generations?.forEach((g) => {
    themeCounts[g.theme_name] = (themeCounts[g.theme_name] || 0) + 1;
  });
  const themeChart = Object.entries(themeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const recent = generations?.slice(0, 10) ?? [];

  return { total, last7, last30, themeChart, recent, ...rest };
}

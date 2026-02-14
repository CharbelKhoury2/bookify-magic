import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DbTheme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_background: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ThemeInsert = Omit<DbTheme, 'created_at' | 'updated_at'>;

export function useThemes(includeInactive = false) {
  return useQuery({
    queryKey: ['themes', includeInactive],
    queryFn: async () => {
      let query = supabase.from('themes').select('*').order('sort_order');
      if (!includeInactive) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbTheme[];
    },
  });
}

export function useThemeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['themes'] });

  const upsert = useMutation({
    mutationFn: async (theme: ThemeInsert) => {
      const { error } = await supabase.from('themes').upsert(theme as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('themes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('themes').update({ is_active } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsert, remove, toggleActive };
}

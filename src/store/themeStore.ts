import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Theme } from '../utils/types';

interface ThemeStore {
    themes: Theme[];
    isLoading: boolean;
    error: string | null;
    fetchThemes: () => Promise<void>;
    subscribeToThemes: () => () => void;
    addTheme: (theme: Partial<Theme>) => Promise<void>;
    updateTheme: (id: string, theme: Partial<Theme>) => Promise<void>;
    deleteTheme: (id: string) => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
    themes: [],
    isLoading: false,
    error: null,
    fetchThemes: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('themes')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;

            const formattedThemes: Theme[] = data.map((t) => ({
                id: t.id,
                name: t.name,
                emoji: t.emoji,
                description: t.description,
                isActive: t.is_active,
                sortOrder: t.sort_order,
                colors: {
                    primary: t.color_primary,
                    secondary: t.color_secondary,
                    accent: t.color_accent,
                    background: t.color_background,
                },
            }));

            set({ themes: formattedThemes, isLoading: false });
        } catch (err: any) {
            console.error('Error fetching themes:', err);
            set({ error: err.message, isLoading: false });
        }
    },
    subscribeToThemes: () => {
        console.log('🔗 [ThemeStore] Subscribing to themes realtime changes...');
        
        // Check if WebSocket is available (may not be on some mobile browsers)
        if (typeof WebSocket === 'undefined' || window.location.protocol === 'file:') {
            console.warn('⚠️ [ThemeStore] WebSocket not available, using polling fallback');
            const pollInterval = setInterval(() => {
                get().fetchThemes();
            }, 30000); // Poll every 30 seconds
            return () => clearInterval(pollInterval);
        }
        
        const channel = supabase
            .channel('themes-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'themes',
                },
                async (payload) => {
                    console.log('✨ [ThemeStore] Realtime event received:', payload.eventType);
                    await get().fetchThemes();
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('❌ [ThemeStore] Realtime subscription failed, falling back to polling');
                    // Fall back to polling on error
                    const pollInterval = setInterval(() => {
                        get().fetchThemes();
                    }, 30000);
                    // Store interval ID on channel for cleanup
                    (channel as any).__pollInterval = pollInterval;
                }
            });

        return () => {
            console.log('🔌 [ThemeStore] Unsubscribing from themes realtime...');
            supabase.removeChannel(channel);
            // Also clear any polling interval that may have been set
            if ((channel as any).__pollInterval) {
                clearInterval((channel as any).__pollInterval);
            }
        };
    },
    addTheme: async (theme) => {
        try {
            const newId = theme.id || `theme_${Date.now()}`;
            const { error } = await supabase.from('themes').insert({
                id: newId,
                name: theme.name || 'New Theme',
                emoji: theme.emoji || '✨',
                description: theme.description || '',
                color_primary: theme.colors?.primary || '#000000',
                color_secondary: theme.colors?.secondary || '#000000',
                color_accent: theme.colors?.accent || '#000000',
                color_background: theme.colors?.background || '#FFFFFF',
                is_active: true,
                sort_order: get().themes.length,
            });

            if (error) throw error;
            await get().fetchThemes();
        } catch (err: any) {
            console.error('Error adding theme:', err);
            throw err;
        }
    },
    updateTheme: async (id, updates) => {
        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.name = updates.name;
            if (updates.emoji) dbUpdates.emoji = updates.emoji;
            if (updates.description) dbUpdates.description = updates.description;
            if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
            if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

            if (updates.colors) {
                if (updates.colors.primary) dbUpdates.color_primary = updates.colors.primary;
                if (updates.colors.secondary) dbUpdates.color_secondary = updates.colors.secondary;
                if (updates.colors.accent) dbUpdates.color_accent = updates.colors.accent;
                if (updates.colors.background) dbUpdates.color_background = updates.colors.background;
            }

            const { error } = await supabase
                .from('themes')
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
            await get().fetchThemes();
        } catch (err: any) {
            console.error('Error updating theme:', err);
            throw err;
        }
    },
    deleteTheme: async (id) => {
        try {
            const { error } = await supabase.from('themes').delete().eq('id', id);
            if (error) throw error;
            await get().fetchThemes();
        } catch (err: any) {
            console.error('Error deleting theme:', err);
            throw err;
        }
    },
}));

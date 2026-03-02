import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Theme } from '../utils/types';
import { RealtimeChannel } from '@supabase/supabase-js';

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

            const formattedThemes: Theme[] = (data || []).map((t) => ({
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
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error fetching themes:', err);
            set({ error: error.message, isLoading: false });
        }
    },
    subscribeToThemes: () => {
        console.log('🔗 [ThemeStore] Subscribing to themes realtime changes...');

        let pollInterval: NodeJS.Timeout | null = null;
        let channel: RealtimeChannel | null = null;

        const startPolling = () => {
            console.warn('⚠️ [ThemeStore] Using polling fallback for themes');
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(() => {
                get().fetchThemes();
            }, 30000); // Poll every 30 seconds
        };

        try {
            // Robust check for WebSocket availability
            const isWebSocketAvailable = typeof window !== 'undefined' &&
                'WebSocket' in window &&
                window.WebSocket !== undefined;

            if (!isWebSocketAvailable || window.location.protocol === 'file:') {
                startPolling();
                return () => { if (pollInterval) clearInterval(pollInterval); };
            }

            channel = supabase
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
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.error(`❌ [ThemeStore] Realtime subscription status: ${status}, falling back to polling`);
                        startPolling();
                    }
                });

        } catch (err) {
            console.error('❌ [ThemeStore] Failed to initialize realtime:', err);
            startPolling();
        }

        return () => {
            console.log('🔌 [ThemeStore] Cleaning up theme subscription...');
            if (channel) {
                try {
                    supabase.removeChannel(channel);
                } catch (e) {
                    console.warn('Could not remove channel', e);
                }
            }
            if (pollInterval) {
                clearInterval(pollInterval);
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
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error adding theme:', error);
            throw error;
        }
    },
    updateTheme: async (id, updates) => {
        try {
            const dbUpdates: Record<string, string | boolean | number | undefined> = {};
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
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error updating theme:', error);
            throw error;
        }
    },
    deleteTheme: async (id) => {
        try {
            const { error } = await supabase.from('themes').delete().eq('id', id);
            if (error) throw error;
            await get().fetchThemes();
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Error deleting theme:', error);
            throw error;
        }
    },
}));

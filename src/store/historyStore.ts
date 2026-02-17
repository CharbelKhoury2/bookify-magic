import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HistoryItem } from '../utils/types';

interface HistoryStore {
  history: HistoryItem[];
  deletedHistory: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  restoreFromHistory: (id: string) => void;
  permanentlyDeleteFromHistory: (id: string) => void;
  clearHistory: () => void;
  clearDeletedHistory: () => void;
  getBookById: (id: string) => HistoryItem | undefined;
  searchHistory: (query: string) => HistoryItem[];
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],
      deletedHistory: [],

      addToHistory: (item) => {
        const newItem: HistoryItem = {
          ...item,
          id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          history: [newItem, ...state.history],
        }));

        console.log('📚 Book saved to history:', newItem.id);
      },

      removeFromHistory: (id) =>
        set((state) => {
          const itemToDelete = state.history.find((item) => item.id === id);
          if (!itemToDelete) return state;

          return {
            history: state.history.filter((item) => item.id !== id),
            deletedHistory: [itemToDelete, ...state.deletedHistory],
          };
        }),

      restoreFromHistory: (id) =>
        set((state) => {
          const itemToRestore = state.deletedHistory.find((item) => item.id === id);
          if (!itemToRestore) return state;

          return {
            deletedHistory: state.deletedHistory.filter((item) => item.id !== id),
            history: [itemToRestore, ...state.history].sort((a, b) => b.timestamp - a.timestamp),
          };
        }),

      permanentlyDeleteFromHistory: (id) =>
        set((state) => ({
          deletedHistory: state.deletedHistory.filter((item) => item.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      clearDeletedHistory: () => set({ deletedHistory: [] }),

      getBookById: (id) => {
        return get().history.find((item) => item.id === id) ||
          get().deletedHistory.find((item) => item.id === id);
      },

      searchHistory: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().history.filter((item) =>
          item.childName.toLowerCase().includes(lowerQuery) ||
          item.themeName.toLowerCase().includes(lowerQuery)
        );
      },
    }),
    {
      name: 'book-history',
    }
  )
);

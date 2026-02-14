import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HistoryItem } from '../utils/types';

interface HistoryStore {
  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  getBookById: (id: string) => HistoryItem | undefined;
  searchHistory: (query: string) => HistoryItem[];
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],

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
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      getBookById: (id) => {
        return get().history.find((item) => item.id === id);
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

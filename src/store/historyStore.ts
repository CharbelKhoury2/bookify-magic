import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HistoryItem } from '../utils/types';

interface HistoryStore {
  history: HistoryItem[];
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      history: [],
      
      addToHistory: (item) =>
        set((state) => ({
          history: [
            {
              ...item,
              id: Date.now().toString(),
              timestamp: Date.now(),
            },
            ...state.history.slice(0, 9),
          ],
        })),
      
      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),
      
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'book-history',
    }
  )
);

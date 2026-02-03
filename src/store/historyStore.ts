import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HistoryItem } from '../utils/types';

interface HistoryStore {
  items: HistoryItem[];
  addItem: (item: HistoryItem) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      items: [],
      
      addItem: (item) => 
        set((state) => ({
          items: [item, ...state.items].slice(0, 20) // Keep last 20 items
        })),
      
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        })),
      
      clearHistory: () => set({ items: [] })
    }),
    {
      name: 'book-history',
      // Don't persist blob URLs as they're temporary
      partialize: (state) => ({
        items: state.items.map(item => ({
          ...item,
          pdfUrl: '', // Clear blob URL
          thumbnailUrl: item.thumbnailUrl // Keep base64 thumbnail
        }))
      })
    }
  )
);

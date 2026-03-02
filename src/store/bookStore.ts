import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, ProcessedPhoto, HistoryItem, ActiveGeneration } from '../utils/types';

interface BookStore {
  childName: string;
  selectedTheme: Theme | null;
  uploadedPhoto: File | null;
  processedPhoto: ProcessedPhoto | null;
  activeGenerations: Record<string, ActiveGeneration>;
  generatedPDF: string | null;
  coverImage: string | null;
  pdfDownloadUrl: string | null;
  pdfDownloadBlob: Blob | null;
  coverDownloadUrl: string | null;
  currentGenerationId: string | null;
  photoName: string | null;
  setChildName: (name: string) => void;
  setSelectedTheme: (theme: Theme | null) => void;
  setUploadedPhoto: (photo: File | null) => void;
  setProcessedPhoto: (photo: ProcessedPhoto | null) => void;
  addActiveGeneration: (gen: ActiveGeneration) => void;
  updateActiveGeneration: (id: string, updates: Partial<ActiveGeneration>) => void;
  removeActiveGeneration: (id: string) => void;
  setGeneratedPDF: (url: string | null) => void;
  setCoverImage: (url: string | null) => void;
  setPdfDownloadUrl: (url: string | null) => void;
  setPdfDownloadBlob: (blob: Blob | null) => void;
  setCoverDownloadUrl: (url: string | null) => void;
  setCurrentGenerationId: (id: string | null) => void;
  loadBook: (data: HistoryItem) => void;
  reset: () => void;
}

export const useBookStore = create<BookStore>()(
  persist(
    (set) => ({
      childName: '',
      selectedTheme: null,
      uploadedPhoto: null,
      processedPhoto: null,
      activeGenerations: {},
      generatedPDF: null,
      coverImage: null,
      pdfDownloadUrl: null,
      pdfDownloadBlob: null,
      coverDownloadUrl: null,
      currentGenerationId: null,
      photoName: null,
      setChildName: (name) => set({ childName: name }),
      setSelectedTheme: (theme) => set({ selectedTheme: theme }),
      setUploadedPhoto: (photo) => set({ uploadedPhoto: photo, photoName: photo ? photo.name : null }),
      setProcessedPhoto: (photo) => set({ processedPhoto: photo }),
      addActiveGeneration: (gen) => set((state) => ({
        activeGenerations: { ...state.activeGenerations, [gen.id]: gen }
      })),
      updateActiveGeneration: (id, updates) => set((state) => ({
        activeGenerations: {
          ...state.activeGenerations,
          [id]: state.activeGenerations[id] ? { ...state.activeGenerations[id], ...updates } : state.activeGenerations[id]
        }
      })),
      removeActiveGeneration: (id) => set((state) => {
        const { [id]: _, ...rest } = state.activeGenerations;
        return { activeGenerations: rest };
      }),
      setGeneratedPDF: (url) => set({ generatedPDF: url }),
      setCoverImage: (url) => set({ coverImage: url }),
      setPdfDownloadUrl: (url) => set({ pdfDownloadUrl: url }),
      setPdfDownloadBlob: (blob) => set({ pdfDownloadBlob: blob }),
      setCoverDownloadUrl: (url) => set({ coverDownloadUrl: url }),
      setCurrentGenerationId: (id) => set({ currentGenerationId: id }),
      loadBook: (data) => set({
        childName: data.childName,
        selectedTheme: { id: '', name: data.themeName, emoji: data.themeEmoji, description: '', colors: { primary: '', secondary: '', accent: '', background: '' } },
        generatedPDF: data.pdfUrl,
        coverImage: data.thumbnailUrl,
        pdfDownloadUrl: data.pdfDownloadUrl || null,
        coverDownloadUrl: data.coverDownloadUrl || null,
        currentGenerationId: null,
      }),
      reset: () => set({
        childName: '',
        selectedTheme: null,
        uploadedPhoto: null,
        processedPhoto: null,
        generatedPDF: null,
        coverImage: null,
        pdfDownloadUrl: null,
        pdfDownloadBlob: null,
        coverDownloadUrl: null,
        currentGenerationId: null,
        photoName: null,
      })
    }),
    {
      name: 'book-generator-storage',
      partialize: (state) => ({
        childName: state.childName,
        selectedTheme: state.selectedTheme,
        activeGenerations: state.activeGenerations,
        currentGenerationId: state.currentGenerationId,
        processedPhoto: state.processedPhoto,
        photoName: state.photoName,
      }),
    }
  )
);

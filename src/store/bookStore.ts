import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, ProcessedPhoto, HistoryItem } from '../utils/types';

interface BookStore {
  childName: string;
  selectedTheme: Theme | null;
  uploadedPhoto: File | null;
  processedPhoto: ProcessedPhoto | null;
  isGenerating: boolean;
  generationProgress: number; // 0-100
  generatedPDF: string | null;
  coverImage: string | null;
  pdfDownloadUrl: string | null;
  pdfDownloadBlob: Blob | null;
  coverDownloadUrl: string | null;
  currentGenerationId: string | null;
  photoName: string | null;
  elapsedTime: number; // in seconds
  setChildName: (name: string) => void;
  setSelectedTheme: (theme: Theme | null) => void;
  setUploadedPhoto: (photo: File | null) => void;
  setProcessedPhoto: (photo: ProcessedPhoto | null) => void;
  setIsGenerating: (status: boolean) => void;
  setGenerationProgress: (p: number) => void;
  setGeneratedPDF: (url: string | null) => void;
  setCoverImage: (url: string | null) => void;
  setPdfDownloadUrl: (url: string | null) => void;
  setPdfDownloadBlob: (blob: Blob | null) => void;
  setCoverDownloadUrl: (url: string | null) => void;
  setCurrentGenerationId: (id: string | null) => void;
  setElapsedTime: (time: number | ((prev: number) => number)) => void;
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
      isGenerating: false,
      generationProgress: 0,
      generatedPDF: null,
      coverImage: null,
      pdfDownloadUrl: null,
      pdfDownloadBlob: null,
      coverDownloadUrl: null,
      currentGenerationId: null,
      photoName: null,
      elapsedTime: 0,
      setChildName: (name) => set({ childName: name }),
      setSelectedTheme: (theme) => set({ selectedTheme: theme }),
      setUploadedPhoto: (photo) => set({ uploadedPhoto: photo, photoName: photo ? photo.name : null }),
      setProcessedPhoto: (photo) => set({ processedPhoto: photo }),
      setIsGenerating: (status) => set({ isGenerating: status }),
      setGenerationProgress: (p) => set({ generationProgress: p }),
      setGeneratedPDF: (url) => set({ generatedPDF: url }),
      setCoverImage: (url) => set({ coverImage: url }),
      setPdfDownloadUrl: (url) => set({ pdfDownloadUrl: url }),
      setPdfDownloadBlob: (blob) => set({ pdfDownloadBlob: blob }),
      setCoverDownloadUrl: (url) => set({ coverDownloadUrl: url }),
      setCurrentGenerationId: (id) => set({ currentGenerationId: id }),
      setElapsedTime: (time) => set((state) => ({ 
        elapsedTime: typeof time === 'function' ? time(state.elapsedTime) : time 
      })),
      loadBook: (data) => set({
        childName: data.childName,
        selectedTheme: { id: '', name: data.themeName, emoji: data.themeEmoji, description: '', colors: { primary: '', secondary: '', accent: '', background: '' } },
        generatedPDF: data.pdfUrl,
        coverImage: data.thumbnailUrl,
        pdfDownloadUrl: data.pdfDownloadUrl || null,
        coverDownloadUrl: data.coverDownloadUrl || null,
        isGenerating: false,
        generationProgress: 100,
        currentGenerationId: null,
        elapsedTime: 0
      }),
      reset: () => set({
        childName: '',
        selectedTheme: null,
        uploadedPhoto: null,
        processedPhoto: null,
        isGenerating: false,
        generationProgress: 0,
        generatedPDF: null,
        coverImage: null,
        pdfDownloadUrl: null,
        pdfDownloadBlob: null,
        coverDownloadUrl: null,
        currentGenerationId: null,
        photoName: null,
        elapsedTime: 0
      })
    }),
    {
      name: 'book-generator-storage',
      partialize: (state) => ({
        childName: state.childName,
        selectedTheme: state.selectedTheme,
        isGenerating: state.isGenerating,
        generationProgress: state.generationProgress,
        currentGenerationId: state.currentGenerationId,
        processedPhoto: state.processedPhoto,
        photoName: state.photoName,
      }),
    }
  )
);




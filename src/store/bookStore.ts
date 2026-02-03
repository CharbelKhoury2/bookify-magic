import { create } from 'zustand';
import { Theme, ProcessedPhoto } from '../utils/types';

interface BookStore {
  childName: string;
  selectedTheme: Theme | null;
  uploadedPhoto: File | null;
  processedPhoto: ProcessedPhoto | null;
  isGenerating: boolean;
  generatedPDF: string | null;
  setChildName: (name: string) => void;
  setSelectedTheme: (theme: Theme | null) => void;
  setUploadedPhoto: (photo: File | null) => void;
  setProcessedPhoto: (photo: ProcessedPhoto | null) => void;
  setIsGenerating: (status: boolean) => void;
  setGeneratedPDF: (url: string | null) => void;
  reset: () => void;
}

export const useBookStore = create<BookStore>((set) => ({
  childName: '',
  selectedTheme: null,
  uploadedPhoto: null,
  processedPhoto: null,
  isGenerating: false,
  generatedPDF: null,
  setChildName: (name) => set({ childName: name }),
  setSelectedTheme: (theme) => set({ selectedTheme: theme }),
  setUploadedPhoto: (photo) => set({ uploadedPhoto: photo }),
  setProcessedPhoto: (photo) => set({ processedPhoto: photo }),
  setIsGenerating: (status) => set({ isGenerating: status }),
  setGeneratedPDF: (url) => set({ generatedPDF: url }),
  reset: () => set({
    childName: '',
    selectedTheme: null,
    uploadedPhoto: null,
    processedPhoto: null,
    isGenerating: false,
    generatedPDF: null
  })
}));

import { create } from 'zustand';
import { Theme, ProcessedPhoto } from '../utils/types';

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
  reset: () => void;
}

export const useBookStore = create<BookStore>((set) => ({
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
  setChildName: (name) => set({ childName: name }),
  setSelectedTheme: (theme) => set({ selectedTheme: theme }),
  setUploadedPhoto: (photo) => set({ uploadedPhoto: photo }),
  setProcessedPhoto: (photo) => set({ processedPhoto: photo }),
  setIsGenerating: (status) => set({ isGenerating: status }),
  setGenerationProgress: (p) => set({ generationProgress: p }),
  setGeneratedPDF: (url) => set({ generatedPDF: url }),
  setCoverImage: (url) => set({ coverImage: url }),
  setPdfDownloadUrl: (url) => set({ pdfDownloadUrl: url }),
  setPdfDownloadBlob: (blob) => set({ pdfDownloadBlob: blob }),
  setCoverDownloadUrl: (url) => set({ coverDownloadUrl: url }),
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
    coverDownloadUrl: null
  })
}));


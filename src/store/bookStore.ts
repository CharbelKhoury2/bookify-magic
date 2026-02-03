import { create } from 'zustand';
import { Theme, GenerationState } from '../utils/types';

interface BookStore {
  // Form data
  childName: string;
  selectedTheme: Theme | null;
  photoFile: File | null;
  photoPreview: string | null;
  
  // Generation state
  generation: GenerationState;
  generatedPdfUrl: string | null;
  
  // Actions
  setChildName: (name: string) => void;
  setSelectedTheme: (theme: Theme | null) => void;
  setPhotoFile: (file: File | null) => void;
  setPhotoPreview: (preview: string | null) => void;
  setGenerationState: (state: Partial<GenerationState>) => void;
  setGeneratedPdfUrl: (url: string | null) => void;
  resetForm: () => void;
  resetGeneration: () => void;
}

const initialGenerationState: GenerationState = {
  isGenerating: false,
  progress: 0,
  stage: 'idle'
};

export const useBookStore = create<BookStore>((set) => ({
  // Initial state
  childName: '',
  selectedTheme: null,
  photoFile: null,
  photoPreview: null,
  generation: initialGenerationState,
  generatedPdfUrl: null,
  
  // Actions
  setChildName: (name) => set({ childName: name }),
  
  setSelectedTheme: (theme) => set({ selectedTheme: theme }),
  
  setPhotoFile: (file) => set({ photoFile: file }),
  
  setPhotoPreview: (preview) => set({ photoPreview: preview }),
  
  setGenerationState: (state) => 
    set((prev) => ({ 
      generation: { ...prev.generation, ...state } 
    })),
  
  setGeneratedPdfUrl: (url) => set({ generatedPdfUrl: url }),
  
  resetForm: () => set({
    childName: '',
    selectedTheme: null,
    photoFile: null,
    photoPreview: null,
    generatedPdfUrl: null,
    generation: initialGenerationState
  }),
  
  resetGeneration: () => set({
    generation: initialGenerationState,
    generatedPdfUrl: null
  })
}));

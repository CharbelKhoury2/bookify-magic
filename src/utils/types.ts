export interface Theme {
  id: string;
  name: string;
  emoji: string;
  description: string;
  isActive?: boolean;
  sortOrder?: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

export interface StoryPage {
  pageNum: number;
  text: string;
  hasPhoto: boolean;
  photoStyle?: string;
}

export interface Story {
  coverTitle: string;
  coverSubtitle: string;
  pages: StoryPage[];
}

export interface BookData {
  childName: string;
  selectedTheme: Theme | null;
  photoFile: File | null;
}

export interface ProcessedPhoto {
  original: string;
  circular: string;
  thumbnail: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface HistoryItem {
  id: string;
  childName: string;
  themeName: string;
  themeEmoji: string;
  timestamp: number;
  pdfUrl: string;
  thumbnailUrl: string;
  pdfDownloadUrl?: string;
  coverDownloadUrl?: string;
}

export interface ActiveGeneration {
  id: string;
  childName: string;
  theme: Theme;
  progress: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  startTime: number;
  elapsedTime: number;
}

export type AppRole = 'admin' | 'moderator' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
  last_sign_in?: string;
}

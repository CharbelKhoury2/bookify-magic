import { pdf } from '@react-pdf/renderer';
import { Theme, HistoryItem } from './types';
import { getStoryByThemeId, personalizeStory } from '../data/stories';
import { processPhotoForPDF } from './imageProcessor';
import React from 'react';
import { PDFDocument } from '../pdf/PDFDocument';

export async function generatePDF(
  childName: string,
  theme: Theme,
  photoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    onProgress?.(10);
    
    // Get and personalize the story
    const story = getStoryByThemeId(theme.id);
    if (!story) {
      throw new Error('Story not found for selected theme');
    }
    
    onProgress?.(20);
    
    const personalizedStory = personalizeStory(story, childName);
    
    onProgress?.(30);
    
    // Process the photo
    const processedPhoto = await processPhotoForPDF(photoFile);
    
    onProgress?.(50);
    
    // Create PDF document element
    const documentElement = React.createElement(PDFDocument, {
      story: personalizedStory,
      theme,
      childName,
      photoUrl: processedPhoto
    });
    
    onProgress?.(70);
    
    // Generate PDF blob - cast to any to avoid strict type checking with @react-pdf/renderer
    const blob = await pdf(documentElement as any).toBlob();
    
    onProgress?.(100);
    
    return blob;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

export function downloadPDF(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createHistoryItem(
  childName: string,
  theme: Theme,
  pdfBlob: Blob,
  thumbnailUrl: string
): HistoryItem {
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  return {
    id: `book_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    childName,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    timestamp: Date.now(),
    pdfUrl,
    thumbnailUrl
  };
}

export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
}

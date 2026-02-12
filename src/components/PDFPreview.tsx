import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { useBookStore } from '../store/bookStore';
import { LoadingSpinner } from './LoadingSpinner';

interface PDFPreviewProps {
  onDownload: () => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ onDownload }) => {
  const { isGenerating, generatedPDF, childName, selectedTheme, generationProgress } = useBookStore();

  if (!isGenerating && !generatedPDF) {
    return null;
  }

  if (isGenerating) {
    return (
      <div className="card-magical flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <LoadingSpinner size="lg" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Creating Your Magical Book ✨
        </h3>
        <p className="text-muted-foreground text-center max-w-xs">
          Crafting beautiful pages with your story...
        </p>
      </div>
    );
  }

  if (generatedPDF) {
    return (
      <div className="card-magical animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <FileText className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            Your Book is Ready! 🎉
          </h3>
          <p className="text-muted-foreground mt-1">
            {childName}'s {selectedTheme?.name} adventure awaits!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={generatedPDF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition-colors"
          >
            <Eye className="w-5 h-5" />
            Preview PDF
          </a>
          <button
            onClick={onDownload}
            className="flex-1 btn-magic flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </button>
        </div>
      </div>
    );
  }

  return null;
};

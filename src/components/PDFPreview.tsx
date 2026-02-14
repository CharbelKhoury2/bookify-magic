import React from 'react';
import { FileText, Download } from 'lucide-react';
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-success" />
            </div>
            <h3 className="font-bold text-foreground">
              {childName}'s {selectedTheme?.name}
            </h3>
          </div>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] rounded-xl overflow-hidden border-2 border-border/50 bg-muted/30 shadow-inner">
          <iframe
            src={`${generatedPDF}#view=FitH`}
            className="w-full h-full border-none"
            title="Book Preview"
          />
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground italic">
            "A magical story created just for you..." ✨
          </p>
        </div>
      </div>
    );
  }

  return null;
};

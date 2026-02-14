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
      <div className="glass-card rounded-3xl p-6 sm:p-8 animate-scale-in relative overflow-hidden shadow-2xl border-white/50">
        <div className="premium-blur -top-20 -right-20" />
        <div className="premium-blurBottom -bottom-20 -left-20" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-magic flex items-center justify-center shadow-glow animate-float">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-foreground leading-tight">
                {childName}'s Adventure
              </h3>
              <p className="text-sm text-primary font-medium opacity-80 uppercase tracking-wider">
                {selectedTheme?.name} Edition
              </p>
            </div>
          </div>

          <button
            onClick={onDownload}
            className="w-full sm:w-auto btn-magic flex items-center justify-center gap-2 shadow-lg"
          >
            <Download className="w-5 h-5" />
            Download Book
          </button>
        </div>

        <div className="book-frame group relative z-10 mx-auto max-w-4xl cursor-default">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-20" />
          <div className="relative aspect-[3/4] sm:aspect-[4/3] rounded-lg overflow-hidden bg-white shadow-2xl">
            <iframe
              src={`${generatedPDF}#toolbar=0&navpanes=0&view=FitH`}
              className="w-full h-full"
              title="Book Preview"
            />
          </div>
        </div>

        <div className="mt-8 text-center relative z-10">
          <div className="inline-block px-6 py-2 rounded-full bg-primary/5 border border-primary/10 shadow-sm">
            <p className="text-sm font-medium text-primary-foreground/70 italic flex items-center gap-2">
              <span className="animate-sparkle">✨</span>
              A magical story created just for {childName}
              <span className="animate-sparkle">✨</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

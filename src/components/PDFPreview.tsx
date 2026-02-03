import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { useBookStore } from '../store/bookStore';
import { LoadingSpinner } from './LoadingSpinner';

interface PDFPreviewProps {
  onDownload: () => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ onDownload }) => {
  const { generation, generatedPdfUrl, childName, selectedTheme } = useBookStore();

  if (generation.stage === 'idle') {
    return null;
  }

  if (generation.stage === 'processing' || generation.stage === 'generating') {
    return (
      <div className="card-magical flex flex-col items-center justify-center py-12 animate-fade-in">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <LoadingSpinner size="lg" progress={generation.progress} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Creating Your Magical Book ✨
        </h3>
        <p className="text-muted-foreground text-center max-w-xs">
          {generation.progress < 30 && "Preparing the story..."}
          {generation.progress >= 30 && generation.progress < 50 && "Processing your photo..."}
          {generation.progress >= 50 && generation.progress < 70 && "Crafting beautiful pages..."}
          {generation.progress >= 70 && "Almost done..."}
        </p>
        <div className="w-full max-w-xs mt-6">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full gradient-magic transition-all duration-500 ease-out rounded-full"
              style={{ width: `${generation.progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (generation.stage === 'error') {
    return (
      <div className="card-magical text-center py-8 animate-fade-in">
        <div className="text-4xl mb-4">😢</div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Oops! Something went wrong
        </h3>
        <p className="text-muted-foreground">{generation.error}</p>
      </div>
    );
  }

  if (generation.stage === 'complete' && generatedPdfUrl) {
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
            href={generatedPdfUrl}
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

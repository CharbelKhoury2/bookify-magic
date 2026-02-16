import React from 'react';
import { FileText, Download, Image, Maximize2 } from 'lucide-react';
import { useBookStore } from '../store/bookStore';
import { LoadingSpinner } from './LoadingSpinner';
import { ImageModal } from './ImageModal';

interface PDFPreviewProps {
  onDownload: () => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ onDownload }) => {
  const {
    isGenerating,
    generatedPDF,
    coverImage,
    childName,
    selectedTheme,
    generationProgress,
    pdfDownloadUrl,
    coverDownloadUrl
  } = useBookStore();

  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);

  const handleDownloadCover = () => {
    if (coverDownloadUrl) {
      console.log('📥 Downloading cover from URL:', coverDownloadUrl);
      // Open the cover download URL in a new tab
      window.open(coverDownloadUrl, '_blank');
    } else if (coverImage) {
      console.log('📥 Downloading cover from preview URL:', coverImage);
      // Fallback to the preview image if no download URL
      window.open(coverImage, '_blank');
    }
  };

  const handleDownloadPDF = () => {
    if (pdfDownloadUrl) {
      console.log('📥 Downloading PDF from URL:', pdfDownloadUrl);
      // Open the PDF download URL in a new tab
      window.open(pdfDownloadUrl, '_blank');
    } else {
      console.log('📥 Downloading PDF using fallback handler');
      // Fallback to the original download handler
      onDownload();
    }
  };

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
      <>
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

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownloadPDF}
                className="w-full sm:w-auto btn-magic flex items-center justify-center gap-2 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Download Story
              </button>

              {(coverDownloadUrl || coverImage) && (
                <button
                  onClick={handleDownloadCover}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary font-semibold hover:bg-primary/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <Image className="w-5 h-5" />
                  Download Cover
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
            {coverImage && (
              <div className="md:col-span-4 lg:col-span-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">Cover Art</p>
                    <button
                      onClick={() => setIsImageModalOpen(true)}
                      className="text-xs font-semibold text-primary hover:text-primary/70 transition-colors flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      Full View
                    </button>
                  </div>
                  <div
                    className="book-frame overflow-hidden aspect-[3/4] shadow-float hover:scale-[1.02] transition-all duration-500 cursor-zoom-in relative group"
                    onClick={() => setIsImageModalOpen(true)}
                  >
                    <img
                      src={coverImage}
                      alt="Book Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 drop-shadow-md" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PDF Preview Section */}
            <div className={coverImage ? "md:col-span-8 lg:col-span-9" : "md:col-span-12"}>
              <div className="space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-widest text-center md:text-left">Story Preview</p>
                <div className="book-frame group mx-auto cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-20" />
                  <div className="relative aspect-[3/4] sm:aspect-[4/3] rounded-lg overflow-hidden bg-white shadow-2xl">
                    <iframe
                      src={`${generatedPDF}#toolbar=0&navpanes=0&view=FitH`}
                      className="w-full h-full"
                      title="Book Preview"
                    />
                  </div>
                </div>
              </div>
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

        <ImageModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          imageUrl={coverImage || ''}
          title={`${childName}'s Magical Adventure`}
        />
      </>
    );
  }

  return null;
};

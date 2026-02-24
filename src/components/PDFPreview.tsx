import React from 'react';
import { FileText, Download, Image, Maximize2, RotateCcw, Clock } from 'lucide-react';
import { useBookStore } from '../store/bookStore';
import { LoadingSpinner } from './LoadingSpinner';
import { ImageModal } from './ImageModal';
import { ProgressBar } from './ProgressBar';
import { safeOpen } from '../utils/security';

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
    pdfDownloadUrl,
    coverDownloadUrl,
    elapsedTime,
    generationProgress
  } = useBookStore();

  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [coverRetryCount, setCoverRetryCount] = React.useState(0);
  const [effectiveCoverUrl, setEffectiveCoverUrl] = React.useState<string | null>(null);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset retry count when coverImage changes
  React.useEffect(() => {
    setEffectiveCoverUrl(coverImage);
    setCoverRetryCount(0);
    if (coverImage) {
      console.log('🖼️ PDFPreview: Cover image URL set to:', coverImage);
    }
  }, [coverImage]);

  // Handle image load errors by trying fallback URLs
  const handleCoverImageError = () => {
    console.warn(`🖼️ Cover image failed to load (attempt ${coverRetryCount + 1}):`, effectiveCoverUrl);

    // Extract Google Drive file ID from the URL
    let driveId: string | null = null;
    if (effectiveCoverUrl) {
      const idMatch = effectiveCoverUrl.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
      if (idMatch) driveId = idMatch[1];
      // Also try to extract from lh3 thumbnail links
      if (!driveId && effectiveCoverUrl.includes('lh3.googleusercontent.com')) {
        // Try to get file ID from the store or original cover URL
        const origMatch = coverImage?.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
        if (origMatch) driveId = origMatch[1];
      }
    }

    const fallbacks = [
      driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000` : null,
      driveId ? `https://lh3.googleusercontent.com/d/${driveId}=s1000` : null,
      driveId ? `https://drive.google.com/uc?id=${driveId}&export=view` : null,
      driveId ? `https://drive.google.com/uc?id=${driveId}&export=download` : null,
    ].filter(Boolean) as string[];

    if (coverRetryCount < fallbacks.length) {
      const nextUrl = fallbacks[coverRetryCount];
      console.log(`🖼️ Trying fallback cover URL #${coverRetryCount + 1}:`, nextUrl);
      setEffectiveCoverUrl(nextUrl);
      setCoverRetryCount(prev => prev + 1);
    } else {
      console.error('🖼️ All cover image fallbacks exhausted');
      setEffectiveCoverUrl(null); // Give up, hide the broken image
    }
  };

  const handleDownloadCover = () => {
    if (coverDownloadUrl) {
      console.log('📥 Downloading cover from URL:', coverDownloadUrl);
      safeOpen(coverDownloadUrl);
    } else if (coverImage) {
      console.log('📥 Downloading cover from preview URL:', coverImage);
      safeOpen(coverImage);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfDownloadUrl) {
      console.log('📥 Downloading PDF from URL:', pdfDownloadUrl);
      safeOpen(pdfDownloadUrl);
    } else {
      console.log('📥 Downloading PDF using fallback handler');
      onDownload();
    }
  };

  if (!isGenerating && !generatedPDF) {
    return null;
  }

  if (isGenerating) {
    return (
      <div className="card-magical flex flex-col items-center justify-center py-12 animate-fade-in relative overflow-hidden">
        <div className="premium-blur -top-20 -right-20 opacity-30" />
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <LoadingSpinner size="lg" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Creating Your Magical Book ✨
        </h3>
        <p className="text-muted-foreground text-center max-w-xs mb-8">
          Crafting beautiful pages with your story...
        </p>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-6 px-4">
          <ProgressBar value={generationProgress} label="Generation Progress" />
        </div>

        {/* Elapsed Timer */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-primary/10 border-2 border-primary/20 shadow-sm animate-pulse">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-primary font-mono font-bold text-2xl tracking-tighter">
              {formatTime(elapsedTime)}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-3 font-black opacity-70">
            Time Elapsed
          </span>
        </div>

        {/* Force Cancel Button */}
        <button
          onClick={() => {
            const { reset } = useBookStore.getState();
            if (window.confirm("Are you sure you want to cancel the generation? This process cannot be resumed.")) {
              reset();
            }
          }}
          className="px-6 py-2.5 rounded-xl border-2 border-destructive/30 text-destructive font-bold hover:bg-destructive/5 hover:border-destructive/60 transition-all flex items-center gap-2 group text-sm"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-[-180deg] transition-transform duration-500" />
          Cancel & Start Over
        </button>
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

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
            {effectiveCoverUrl && (
              <div className="md:col-span-5 lg:col-span-4">
                <div className="space-y-4">
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
                    className="book-frame overflow-hidden aspect-[3/4] shadow-glow hover:scale-[1.03] transition-all duration-500 cursor-zoom-in relative group border-[16px] border-white dark:border-card"
                    onClick={() => setIsImageModalOpen(true)}
                  >
                    <img
                      src={effectiveCoverUrl}
                      alt="Book Cover"
                      className="w-full h-full object-cover"
                      onError={handleCoverImageError}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <Maximize2 className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 drop-shadow-md" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={effectiveCoverUrl ? "md:col-span-7 lg:col-span-8" : "md:col-span-12"}>
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
          imageUrl={effectiveCoverUrl || ''}
          title={`${childName}'s Magical Adventure`}
        />
      </>
    );
  }

  return null;
};

import React, { useState } from 'react';
import { FileText, Download, Image, Loader2 } from 'lucide-react';
import { useBookStore } from '../store/bookStore';
import { LoadingSpinner } from './LoadingSpinner';

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

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCover, setDownloadingCover] = useState(false);

  const downloadFile = async (url: string, filename: string, setLoading: (loading: boolean) => void) => {
    try {
      setLoading(true);
      console.log('📥 Downloading file from:', url);

      // Fetch the file
      const response = await fetch(url);
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      console.log('✅ Download initiated for:', filename);
    } catch (error) {
      console.error('❌ Download failed:', error);
      // Fallback: open in new tab if download fails (e.g., CORS issues)
      window.open(url, '_blank');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCover = () => {
    const url = coverDownloadUrl || coverImage;
    if (url && !downloadingCover) {
      const filename = `${childName}_${selectedTheme?.name} _Cover.png`;
      downloadFile(url, filename, setDownloadingCover);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfDownloadUrl && !downloadingPDF) {
      const filename = `${childName}_${selectedTheme?.name} _Story.pdf`;
      downloadFile(pdfDownloadUrl, filename, setDownloadingPDF);
    } else if (!pdfDownloadUrl) {
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
            {/* PDF Download Button - Primary */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-white overflow-hidden shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="relative flex items-center justify-center gap-3">
                {downloadingPDF ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 group-hover:animate-bounce" />
                )}
                <span className="text-base">{downloadingPDF ? 'Downloading...' : 'Download Story'}</span>
              </div>
            </button>

            {/* Cover Download Button - Secondary */}
            {(coverDownloadUrl || coverImage) && (
              <button
                onClick={handleDownloadCover}
                disabled={downloadingCover}
                className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl font-bold overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: '2px solid rgba(102, 126, 234, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-3">
                  {downloadingCover ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#667eea' }} />
                  ) : (
                    <Image className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" style={{ color: '#667eea' }} />
                  )}
                  <span className="text-base" style={{ color: '#667eea' }}>
                    {downloadingCover ? 'Downloading...' : 'Download Cover'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10">
          {/* Cover Image Section */}
          {coverImage && (
            <div className="md:col-span-4 lg:col-span-3">
              <div className="space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-widest text-center md:text-left">Cover Art</p>
                <div className="book-frame overflow-hidden aspect-[3/4] shadow-float hover:scale-[1.02] transition-transform duration-500">
                  <img
                    src={coverImage}
                    alt="Book Cover"
                    className="w-full h-full object-cover"
                  />
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
                    src={`${generatedPDF} #toolbar = 0 & navpanes=0 & view=FitH`}
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
    );
  }

  return null;
};

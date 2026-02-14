import React, { useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { PhotoUploader } from './PhotoUploader';
import { PDFPreview } from './PDFPreview';
import { FinishedModal } from './FinishedModal';
import { Toast, ToastType } from './Toast';
import { ErrorBoundary } from './ErrorBoundary';
import { useBookStore } from '../store/bookStore';
import { useHistoryStore } from '../store/historyStore';
import { validateBookData } from '../utils/validators';
import { downloadPDF, sanitizeFileName } from '../utils/pdfGenerator';
import { startGenerationViaWebhook } from '../utils/webhookClient';

export const BookGenerator: React.FC = () => {
  const {
    childName,
    setChildName,
    selectedTheme,
    uploadedPhoto,
    processedPhoto,
    isGenerating,
    setIsGenerating,
    generatedPDF,
    setGeneratedPDF,
    coverImage,
    setCoverImage,
    generationProgress,
    setGenerationProgress,
    reset
  } = useBookStore();

  const { addToHistory } = useHistoryStore();

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [showFinished, setShowFinished] = useState(false);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const handleGenerate = async () => {
    const validation = validateBookData(childName, selectedTheme?.id || null, uploadedPhoto);
    if (!validation.isValid) {
      showToast(validation.error || 'Please fill in all fields', 'error');
      return;
    }

    if (!selectedTheme || !uploadedPhoto) return;

    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      setCoverImage(null);

      const { pdfBlob, pdfUrl, coverImageUrl } = await startGenerationViaWebhook(
        childName.trim(),
        selectedTheme,
        uploadedPhoto,
        (p) => setGenerationProgress(p)
      );

      let finalPdfUrl: string | null = null;
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        finalPdfUrl = url;
        setGeneratedBlob(pdfBlob);
      } else if (pdfUrl) {
        finalPdfUrl = pdfUrl;
      }

      if (!finalPdfUrl) throw new Error('No PDF returned from webhook');

      if (coverImageUrl) {
        setCoverImage(coverImageUrl);
      }

      addToHistory({
        childName: childName.trim(),
        themeName: selectedTheme.name,
        themeEmoji: selectedTheme.emoji,
        pdfUrl: finalPdfUrl,
        thumbnailUrl: coverImageUrl || processedPhoto?.thumbnail || ''
      });

      setGeneratedPDF(finalPdfUrl);
      setIsGenerating(false);
      setGenerationProgress(100);
      showToast('Your magical book is ready!', 'success');
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      const message = error instanceof Error ? error.message : 'Failed to generate book. Please try again.';
      showToast(message, 'error');
    }
  };

  const handleDownload = () => {
    if (generatedBlob && selectedTheme) {
      const fileName = `${sanitizeFileName(childName)}_${sanitizeFileName(selectedTheme.name)}_book.pdf`;
      downloadPDF(generatedBlob, fileName);
      showToast('Download started!', 'success');
    } else if (generatedPDF) {
      window.open(generatedPDF, '_blank');
    }
  };

  const handleReset = () => {
    reset();
    setGeneratedBlob(null);
    setGenerationProgress(0);
    setShowFinished(false);
    setCoverImage(null);
  };

  const isFormValid = childName.trim().length >= 2 && selectedTheme && uploadedPhoto;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Main Form Card */}
        <div className="card-magical animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full gradient-magic flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Create Your Book</h2>
              <p className="text-sm text-muted-foreground">Fill in the details below</p>
            </div>
          </div>

          {/* Child Name Input */}
          <div className="space-y-4 mb-6">
            <label className="block text-lg font-semibold text-foreground">
              Child's Name 👦👧
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Enter the child's name..."
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              maxLength={30}
              disabled={isGenerating}
            />
            {childName && (
              <p className="text-sm text-muted-foreground">
                The story will feature <span className="font-semibold text-primary">{childName}</span> as the main character!
              </p>
            )}
          </div>

          {/* Theme Selector */}
          <div className="mb-6">
            <ThemeSelector />
          </div>

          {/* Photo Uploader */}
          <div className="mb-6">
            <PhotoUploader onError={(msg) => showToast(msg, 'error')} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || isGenerating}
              className={`
                flex-1 btn-magic flex items-center justify-center gap-2
                ${(!isFormValid || isGenerating) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
              `}
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? 'Creating Magic...' : 'Generate Book'}
            </button>

            {(generatedPDF || childName || selectedTheme || uploadedPhoto) && (
              <button
                onClick={handleReset}
                disabled={isGenerating}
                className="px-6 py-3 rounded-xl border-2 border-border text-muted-foreground font-semibold hover:border-destructive hover:text-destructive transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            )}
          </div>
        </div>

        {/* PDF Preview / Status */}
        <PDFPreview onDownload={handleDownload} />

        {/* Finished Modal */}
        <FinishedModal
          open={showFinished}
          onClose={() => setShowFinished(false)}
          onView={() => {
            if (generatedPDF) {
              window.open(generatedPDF, '_blank');
            }
          }}
        />

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

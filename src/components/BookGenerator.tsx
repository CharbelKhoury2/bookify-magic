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
import { startGenerationViaWebhook, logGenerationStart, updateGenerationStatus } from '../utils/webhookClient';
import { safeOpen } from '../utils/security';

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
    pdfDownloadUrl,
    setPdfDownloadUrl,
    pdfDownloadBlob,
    setPdfDownloadBlob,
    coverDownloadUrl,
    setCoverDownloadUrl,
    currentGenerationId,
    setCurrentGenerationId,
    reset
  } = useBookStore();

  const { addToHistory } = useHistoryStore();

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [showFinished, setShowFinished] = useState(false);

  // Prevention for accidental refresh during generation
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to show "Are you sure you want to leave?"
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  // Initialization: If we were generating before refresh, check if we need to clean up
  React.useEffect(() => {
    if (isGenerating) {
      console.log('🔄 Resuming generation state after refresh...');
      showToast('Magic is still in progress! Please wait...', 'info');

      // Safety timeout: If it stays "generating" for too long without a result, reset it
      // Increased to 1 hour to accommodate very long AI generations
      const timer = setTimeout(() => {
        if (isGenerating) {
          setIsGenerating(false);
          setGenerationProgress(0);
          setCurrentGenerationId(null);
          showToast('The magic session took longer than expected. If it continues, please check your network or try again later.', 'error');
        }
      }, 3600000); // 1 hour

      return () => clearTimeout(timer);
    }
  }, []);

  const handleGenerate = async () => {
    const validation = validateBookData(childName, selectedTheme?.id || null, uploadedPhoto);
    if (!validation.isValid) {
      showToast(validation.error || 'Please fill in all fields', 'error');
      return;
    }

    if (!selectedTheme || !uploadedPhoto) return;

    let generationId: string | null = null;
    try {
      console.log('🚀 [UI] Starting generation process...');
      setIsGenerating(true);
      setGenerationProgress(0);
      setCoverImage(null);
      setPdfDownloadUrl(null);
      setPdfDownloadBlob(null);
      setCoverDownloadUrl(null);

      // Log the start of generation in DB
      generationId = await logGenerationStart(childName.trim(), selectedTheme.id, selectedTheme.name);
      setCurrentGenerationId(generationId);

      console.log('📡 [UI] Calling webhook client (Detailed)...');
      let result;
      try {
        result = await startGenerationViaWebhook(
          childName.trim(),
          selectedTheme,
          uploadedPhoto,
          (p) => {
            console.log(`📊 [UI] Progress: ${p}%`);
            setGenerationProgress(p);
          }
        );
      } catch (webhookError: any) {
        console.error('🛑 [UI] Webhook execution failed:', webhookError);
        throw webhookError; // Re-throw to be caught by the outer catch
      }

      console.log('✨ [UI] Webhook call finished, processing results...', result);
      const { pdfBlob, pdfUrl, coverImageUrl, pdfDownloadUrl: downloadPdfUrl, coverDownloadUrl: downloadCoverUrl } = result;

      // Update DB to completed
      if (generationId) {
        await updateGenerationStatus(generationId, 'completed');
      }

      let finalPdfUrl: string | null = null;
      if (pdfBlob) {
        console.log('📄 [UI] PDF Blob received, creating local URL');
        const url = URL.createObjectURL(pdfBlob);
        finalPdfUrl = url;
        setGeneratedBlob(pdfBlob);
        setPdfDownloadBlob(pdfBlob);
      } else if (pdfUrl) {
        console.log('📄 [UI] PDF URL received:', pdfUrl);
        finalPdfUrl = pdfUrl;
      }

      if (!finalPdfUrl) {
        console.error('❌ [UI] No PDF URL or Blob found in result object');
        throw new Error('No PDF returned from webhook. Check the console for details.');
      }

      if (coverImageUrl) {
        setCoverImage(coverImageUrl);
        console.log('📸 [UI] Cover image set for preview:', coverImageUrl);
      }

      // Store download URLs for both files
      if (downloadPdfUrl) setPdfDownloadUrl(downloadPdfUrl);
      if (downloadCoverUrl) setCoverDownloadUrl(downloadCoverUrl);

      // Save to history
      addToHistory({
        childName: childName.trim(),
        themeName: selectedTheme.name,
        themeEmoji: selectedTheme.emoji,
        pdfUrl: finalPdfUrl,
        thumbnailUrl: coverImageUrl || processedPhoto?.thumbnail || '',
        pdfDownloadUrl: downloadPdfUrl,
        coverDownloadUrl: downloadCoverUrl
      });

      console.log('🎉 [UI] Generation complete! Finalizing state.');
      setGeneratedPDF(finalPdfUrl);
      setIsGenerating(false);
      setGenerationProgress(100);
      setCurrentGenerationId(null);
      showToast('Your magical book is ready!', 'success');
    } catch (error) {
      console.error('🛑 [UI] Fatal Generation Error:', error);

      // Update DB to failed
      if (generationId) {
        await updateGenerationStatus(generationId, 'failed');
      }

      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentGenerationId(null);
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
      safeOpen(generatedPDF);
    }
  };

  const handleReset = () => {
    // If generation is in progress, confirm before force stopping
    if (isGenerating) {
      if (!window.confirm('Are you sure you want to force stop? The current generation cannot be resumed.')) {
        return;
      }
    }

    reset();
    setGeneratedBlob(null);
    setGenerationProgress(0);
    setShowFinished(false);
    setCoverImage(null);
    setPdfDownloadUrl(null);
    setPdfDownloadBlob(null);
    setCoverDownloadUrl(null);
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
                className={`px-6 py-3 rounded-xl border-2 font-semibold transition-colors flex items-center justify-center gap-2 ${isGenerating
                  ? 'border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive'
                  : 'border-border text-muted-foreground hover:border-destructive hover:text-destructive'
                  }`}
              >
                <RotateCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin-once' : ''}`} />
                {isGenerating ? 'Force Stop' : 'Start Over'}
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
              safeOpen(generatedPDF);
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

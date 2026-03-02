import React, { useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { PhotoUploader } from './PhotoUploader';
import { PDFPreview } from './PDFPreview';
import { Toast, ToastType } from './Toast';
import { ErrorBoundary } from './ErrorBoundary';
import { useBookStore } from '../store/bookStore';
import { useHistoryStore } from '../store/historyStore';
import { validateBookData } from '../utils/validators';
import { downloadPDF, sanitizeFileName } from '../utils/pdfGenerator';
import { startGenerationViaWebhook, logGenerationStart, updateGenerationStatus, resumeGenerationMonitoring } from '../utils/webhookClient';
import { safeOpen } from '../utils/security';
import { forceDownload } from '../utils/imageUtils';

export const BookGenerator: React.FC = () => {
  const {
    childName,
    setChildName,
    selectedTheme,
    uploadedPhoto,
    processedPhoto,
    activeGenerations,
    addActiveGeneration,
    updateActiveGeneration,
    removeActiveGeneration,
    generatedPDF,
    setGeneratedPDF,
    coverImage,
    setCoverImage,
    pdfDownloadUrl,
    setPdfDownloadUrl,
    pdfDownloadBlob,
    setPdfDownloadBlob,
    coverDownloadUrl,
    setCoverDownloadUrl,
    setCurrentGenerationId,
    reset
  } = useBookStore();

  const { addToHistory } = useHistoryStore();

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialization: Resume any pending generations after refresh
  React.useEffect(() => {
    Object.values(activeGenerations).forEach(gen => {
      if (gen.status === 'pending') {
        resumeMonitoring(gen.id);
      }
    });
  }, []);

  const resumeMonitoring = async (id: string) => {
    try {
      const result = await resumeGenerationMonitoring(id, (p) => {
        updateActiveGeneration(id, { progress: p, elapsedTime: Math.floor((Date.now() - activeGenerations[id].startTime) / 1000) });
      });

      if (result) {
        handleGenerationSuccess(result, id);
      }
    } catch (err: any) {
      console.error(`🛑 [RESUME] Failed to resume monitoring for ${id}:`, err);
      updateActiveGeneration(id, { status: 'failed', error: err.message });
      showToast(err.message || 'We lost the magical trail for one of your books!', 'error');
    }
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const handleGenerationSuccess = (result: any, generationId: string) => {
    const { pdfBlob, pdfUrl, coverImageUrl, pdfDownloadUrl: downloadPdfUrl, coverDownloadUrl: downloadCoverUrl } = result;

    updateGenerationStatus(generationId, 'completed');

    let finalPdfUrl: string | null = null;
    if (pdfBlob) {
      finalPdfUrl = URL.createObjectURL(pdfBlob);
      setPdfDownloadBlob(pdfBlob);
    } else if (pdfUrl) {
      finalPdfUrl = pdfUrl;
    }

    if (!finalPdfUrl) return;

    if (coverImageUrl) setCoverImage(coverImageUrl);
    if (downloadPdfUrl) setPdfDownloadUrl(downloadPdfUrl);
    if (downloadCoverUrl) setCoverDownloadUrl(downloadCoverUrl);

    const gen = activeGenerations[generationId];
    if (gen) {
      addToHistory({
        childName: gen.childName,
        themeName: gen.theme.name,
        themeEmoji: gen.theme.emoji,
        pdfUrl: finalPdfUrl,
        thumbnailUrl: coverImageUrl || '',
        pdfDownloadUrl: downloadPdfUrl,
        coverDownloadUrl: downloadCoverUrl
      });
      showToast(`✨ Magic complete! "${gen.childName}'s ${gen.theme.name}" is now in your library.`, 'success');
    }

    updateActiveGeneration(generationId, { progress: 100, status: 'completed' });

    setTimeout(() => {
      removeActiveGeneration(generationId);
    }, 5000);
  };

  const handleGenerate = async () => {
    const validation = validateBookData(childName, selectedTheme?.id || null, uploadedPhoto);
    if (!validation.isValid) {
      showToast(validation.error || 'Please fill in all the magical ingredients! ✨', 'error');
      return;
    }

    if (!selectedTheme || !uploadedPhoto) return;

    setIsSubmitting(true);
    let generationId: string | null = null;
    try {
      generationId = await logGenerationStart(childName.trim(), selectedTheme.id, selectedTheme.name);
      if (!generationId) throw new Error("Failed to initialize magic");

      const newGen = {
        id: generationId,
        childName: childName.trim(),
        theme: selectedTheme,
        progress: 0,
        status: 'pending' as const,
        startTime: Date.now(),
        elapsedTime: 0
      };

      addActiveGeneration(newGen);
      showToast('Magic started! You can see progress in My Library. ✨', 'success');

      // Clear form so user can start another one
      const currentPhoto = uploadedPhoto;
      const currentProcessed = processedPhoto;
      reset();

      // Start the actual generation process in the "background"
      runGeneration(generationId, newGen.childName, newGen.theme, currentPhoto, currentProcessed?.original);

    } catch (err: any) {
      console.error('🛑 [UI] Error initiating generation:', err);
      if (generationId) {
        updateActiveGeneration(generationId, { status: 'failed', error: err.message });
        await updateGenerationStatus(generationId, 'failed');
      }
      showToast(err.message || 'The magic portal failed to open!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runGeneration = async (id: string, name: string, theme: any, photo: File, photoBase64?: string) => {
    try {
      const result = await startGenerationViaWebhook(
        name,
        theme,
        photo,
        id,
        (p) => {
          updateActiveGeneration(id, { progress: p });
        },
        photoBase64
      );

      if (result) {
        handleGenerationSuccess(result, id);
      }
    } catch (err: any) {
      console.error(`🛑 [RUN] Generation failed for ${id}:`, err);
      updateActiveGeneration(id, { status: 'failed', error: err.message });
      await updateGenerationStatus(id, 'failed');
    }
  };

  const handleDownload = () => {
    const fileName = `${sanitizeFileName(childName)}_${sanitizeFileName(selectedTheme?.name || 'Story')}_book.pdf`;

    if (pdfDownloadBlob) {
      forceDownload(pdfDownloadBlob, fileName);
    } else {
      forceDownload(pdfDownloadUrl || generatedPDF, fileName);
    }

    showToast('Download started!', 'success');
  };

  const handleReset = () => {
    reset();
    setGeneratedPDF(null);
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
              disabled={isSubmitting}
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
              disabled={!isFormValid || isSubmitting}
              className={`
                flex-1 btn-magic flex items-center justify-center gap-2
                ${(!isFormValid || isSubmitting) ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
              `}
            >
              <Sparkles className="w-5 h-5" />
              {isSubmitting ? 'Starting Magic...' : 'Generate Book'}
            </button>

            {(generatedPDF || childName || selectedTheme || uploadedPhoto) && (
              <button
                onClick={handleReset}
                className={`px-6 py-3 rounded-xl border-2 font-semibold transition-colors flex items-center justify-center gap-2 border-border text-muted-foreground hover:border-destructive hover:text-destructive`}
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            )}
          </div>
        </div>

        {/* PDF Preview / Status */}
        <PDFPreview onDownload={handleDownload} />

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

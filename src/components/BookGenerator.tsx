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
import { startGenerationViaWebhook, logGenerationStart, updateGenerationStatus, resumeGenerationMonitoring, syncCompletedGenerations, getPdfUrlForGeneration } from '../utils/webhookClient';
import { safeOpen } from '../utils/security';
import { forceDownload } from '../utils/imageUtils';
import { Theme, HistoryItem } from '../utils/types';
import { supabase } from '@/integrations/supabase/client';

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
  const monitoringRef = React.useRef<Set<string>>(new Set());

  const showToast = React.useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  const handleGenerationSuccess = React.useCallback((result: {
    pdfBlob?: Blob;
    pdfUrl?: string;
    coverImageUrl?: string;
    pdfDownloadUrl?: string;
    coverDownloadUrl?: string;
    childName?: string;
    themeName?: string;
    themeEmoji?: string;
  }, generationId: string) => {
    const { pdfBlob, pdfUrl, coverImageUrl, pdfDownloadUrl: downloadPdfUrl, coverDownloadUrl: downloadCoverUrl, childName: resChildName, themeName: resThemeName, themeEmoji: resThemeEmoji } = result;

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

    // Use getState() to get the absolute latest activeGenerations and avoid stale closure issues
    const latestActiveGenerations = useBookStore.getState().activeGenerations;
    const gen = latestActiveGenerations[generationId];

    if (gen) {
      console.log('📝 [SUCCESS] Saving book to library for:', gen.childName);
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
    } else if (resChildName && resThemeName) {
      console.log('📝 [SUCCESS] Saving book to library via fallback metadata for:', resChildName);
      addToHistory({
        childName: resChildName,
        themeName: resThemeName,
        themeEmoji: resThemeEmoji || '📚',
        pdfUrl: finalPdfUrl,
        thumbnailUrl: coverImageUrl || '',
        pdfDownloadUrl: downloadPdfUrl,
        coverDownloadUrl: downloadCoverUrl
      });
      showToast(`✨ Magic complete! "${resChildName}'s ${resThemeName}" is now in your library.`, 'success');
    }

    setGeneratedPDF(finalPdfUrl);
    updateActiveGeneration(generationId, { progress: 100, status: 'completed' });

    setTimeout(() => {
      removeActiveGeneration(generationId);
      monitoringRef.current.delete(generationId);
    }, 5000);
  }, [addToHistory, removeActiveGeneration, setCoverDownloadUrl, setCoverImage, setPdfDownloadBlob, setPdfDownloadUrl, updateActiveGeneration, showToast]);

  const resumeMonitoring = React.useCallback(async (id: string) => {
    if (monitoringRef.current.has(id)) return;
    monitoringRef.current.add(id);

    try {
      const result = await resumeGenerationMonitoring(id, (p) => {
        const latestActiveGenerations = useBookStore.getState().activeGenerations;
        const startTime = latestActiveGenerations[id]?.startTime || Date.now();
        updateActiveGeneration(id, { progress: p, elapsedTime: Math.floor((Date.now() - startTime) / 1000) });
      });

      if (result) {
        handleGenerationSuccess((result as { 
          pdfBlob?: Blob;
          pdfUrl?: string;
          coverImageUrl?: string;
          pdfDownloadUrl?: string;
          coverDownloadUrl?: string;
          childName?: string;
          themeName?: string;
          themeEmoji?: string;
        }), id);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`🛑 [RESUME] Failed to resume monitoring for ${id}:`, err);
      updateActiveGeneration(id, { status: 'failed', error: error.message });
      showToast(error.message || 'We lost the magical trail for one of your books!', 'error');
      monitoringRef.current.delete(id);
    }
  }, [updateActiveGeneration, handleGenerationSuccess, showToast]);

  // Initialization: Resume any pending generations after refresh
  React.useEffect(() => {
    Object.values(activeGenerations).forEach(gen => {
      if (gen.status === 'pending' && !monitoringRef.current.has(gen.id)) {
        resumeMonitoring(gen.id);
      }
    });
  }, [activeGenerations, resumeMonitoring]);

  // Sync completed generations from database
  React.useEffect(() => {
    const syncStatus = async (generationId: string, status: 'completed' | 'failed', error?: string) => {
      const gen = activeGenerations[generationId];
      if (!gen) return;

      if (status === 'completed') {
        console.log(`✅ [SYNC] Generation ${generationId} completed, adding to library...`);
        
        // Try to get the completed data from database
        try {
          const result = await resumeGenerationMonitoring(generationId);
          if (result) {
            handleGenerationSuccess(result, generationId);
            console.log(`✅ [SYNC] Successfully added ${generationId} to library`);
          } else {
            // Fallback: Create library entry from database data
            const pdfData = await getPdfUrlForGeneration(generationId);
            if (pdfData) {
              const libraryItem: HistoryItem = {
                id: generationId,
                childName: pdfData.childName,
                themeName: pdfData.themeName,
                themeEmoji: pdfData.themeEmoji,
                timestamp: Date.now(),
                pdfUrl: pdfData.pdfUrl,
                thumbnailUrl: pdfData.coverImageUrl || '',
                pdfDownloadUrl: pdfData.pdfDownloadUrl,
                coverDownloadUrl: pdfData.coverDownloadUrl
              };
              
              addToHistory(libraryItem);
              console.log(`✅ [SYNC] Added ${generationId} to library via fallback`);
              
              // Update and remove from active
              updateActiveGeneration(generationId, { status: 'completed', progress: 100 });
              setTimeout(() => {
                removeActiveGeneration(generationId);
                monitoringRef.current.delete(generationId);
              }, 5000);
            } else {
              console.warn(`⚠️ [SYNC] Could not get PDF data for ${generationId}`);
              updateActiveGeneration(generationId, { status: 'completed', progress: 100 });
            }
          }
        } catch (err) {
          console.error('❌ [SYNC] Failed to handle completed generation:', err);
          updateActiveGeneration(generationId, { status: 'completed', progress: 100 });
        }
      } else if (status === 'failed') {
        console.log(`❌ [SYNC] Generation ${generationId} failed`);
        updateActiveGeneration(generationId, { status: 'failed', error });
        monitoringRef.current.delete(generationId);
      }
    };

    // Initial sync
    if (Object.keys(activeGenerations).length > 0) {
      console.log(`🔄 [SYNC] Checking ${Object.keys(activeGenerations).length} active generations...`);
      syncCompletedGenerations(activeGenerations, syncStatus);
    }

    // Set up periodic polling every 30 seconds to check for completed books
    const interval = setInterval(() => {
      if (Object.keys(activeGenerations).length > 0) {
        console.log(`🔄 [SYNC] Periodic check for ${Object.keys(activeGenerations).length} active generations...`);
        syncCompletedGenerations(activeGenerations, syncStatus);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeGenerations, handleGenerationSuccess, removeActiveGeneration, resumeGenerationMonitoring, syncCompletedGenerations, updateActiveGeneration, addToHistory]);

  // Background sync: Check for completed books that might have been missed
  React.useEffect(() => {
    const backgroundSync = async () => {
      try {
        console.log('🔍 [BACKGROUND] Checking for any missed completed books...');
        
        // Get all completed books from database
        const { data: { user } } = await supabase.auth.getUser();
        const { data: completedBooks, error } = await supabase
          .from('book_generations')
          .select('*')
          .eq('status', 'completed')
          .eq('user_id', user?.id || null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [BACKGROUND] Failed to fetch completed books:', error);
          return;
        }

        if (!completedBooks || completedBooks.length === 0) {
          console.log('🔍 [BACKGROUND] No completed books found in database');
          return;
        }

        console.log(`🔍 [BACKGROUND] Found ${completedBooks.length} completed books in database`);

        // Check if any completed books are missing from the library
        const currentHistory = useHistoryStore.getState().history;
        const currentHistoryIds = new Set(currentHistory.map(item => item.id));

        for (const book of completedBooks) {
          if (!currentHistoryIds.has(book.id)) {
            console.log(`📚 [BACKGROUND] Adding missed book to library: ${book.id}`);
            
            // Get PDF data for this book
            const pdfData = await getPdfUrlForGeneration(book.id);
            if (pdfData) {
              const libraryItem: HistoryItem = {
                id: book.id,
                childName: pdfData.childName,
                themeName: pdfData.themeName,
                themeEmoji: pdfData.themeEmoji,
                timestamp: new Date(book.created_at).getTime(),
                pdfUrl: pdfData.pdfUrl,
                thumbnailUrl: pdfData.coverImageUrl || '',
                pdfDownloadUrl: pdfData.pdfDownloadUrl,
                coverDownloadUrl: pdfData.coverDownloadUrl
              };
              
              addToHistory(libraryItem);
              console.log(`✅ [BACKGROUND] Added missed book ${book.id} to library`);
            }
          }
        }
      } catch (error) {
        console.error('❌ [BACKGROUND] Error in background sync:', error);
      }
    };

    // Run background sync every 2 minutes
    const interval = setInterval(backgroundSync, 120000);
    
    // Also run it once on component mount
    backgroundSync();

    return () => clearInterval(interval);
  }, [addToHistory]);

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

    } catch (err: unknown) {
      const error = err as Error;
      console.error('🛑 [UI] Error initiating generation:', err);
      if (generationId) {
        updateActiveGeneration(generationId, { status: 'failed', error: error.message });
        await updateGenerationStatus(generationId, 'failed');
      }
      showToast(error.message || 'The magic portal failed to open!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runGeneration = async (id: string, name: string, theme: Theme, photo: File, photoBase64?: string) => {
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
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`🛑 [RUN] Generation failed for ${id}:`, err);
      updateActiveGeneration(id, { status: 'failed', error: error.message });
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

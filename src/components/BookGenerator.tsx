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
import { generatePDF, downloadPDF, createHistoryItem, sanitizeFileName } from '../utils/pdfGenerator';
import { createThumbnail } from '../utils/imageProcessor';

export const BookGenerator: React.FC = () => {
  const {
    childName,
    setChildName,
    selectedTheme,
    photoFile,
    generation,
    setGenerationState,
    setGeneratedPdfUrl,
    generatedPdfUrl,
    resetForm,
    resetGeneration
  } = useBookStore();
  
  const { addItem } = useHistoryStore();
  
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const handleGenerate = async () => {
    // Validate inputs
    const validation = validateBookData(childName, selectedTheme?.id || null, photoFile);
    if (!validation.isValid) {
      showToast(validation.error || 'Please fill in all fields', 'error');
      return;
    }

    if (!selectedTheme || !photoFile) return;

    try {
      setGenerationState({ 
        isGenerating: true, 
        stage: 'processing', 
        progress: 0,
        error: undefined 
      });

      const blob = await generatePDF(
        childName.trim(),
        selectedTheme,
        photoFile,
        (progress) => {
          setGenerationState({ 
            progress,
            stage: progress < 70 ? 'processing' : 'generating'
          });
        }
      );

      // Create thumbnail for history
      const thumbnail = await createThumbnail(photoFile);
      
      // Create history item
      const historyItem = createHistoryItem(
        childName.trim(),
        selectedTheme,
        blob,
        thumbnail
      );
      addItem(historyItem);

      // Store the blob for download
      setGeneratedBlob(blob);
      setGeneratedPdfUrl(historyItem.pdfUrl);
      setGenerationState({ 
        isGenerating: false, 
        stage: 'complete', 
        progress: 100 
      });

      showToast('Your magical book is ready!', 'success');
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationState({ 
        isGenerating: false, 
        stage: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate book'
      });
      showToast('Failed to generate book. Please try again.', 'error');
    }
  };

  const handleDownload = () => {
    if (generatedBlob && selectedTheme) {
      const fileName = `${sanitizeFileName(childName)}_${sanitizeFileName(selectedTheme.name)}_book.pdf`;
      downloadPDF(generatedBlob, fileName);
      showToast('Download started!', 'success');
    }
  };

  const handleReset = () => {
    resetForm();
    resetGeneration();
    setGeneratedBlob(null);
  };

  const isFormValid = childName.trim().length >= 2 && selectedTheme && photoFile;
  const isGenerating = generation.isGenerating;

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
            
            {(generation.stage !== 'idle' || childName || selectedTheme || photoFile) && (
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

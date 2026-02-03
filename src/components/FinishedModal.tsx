import React from 'react';
import { FileText, X } from 'lucide-react';

interface FinishedModalProps {
  open: boolean;
  onClose: () => void;
  onView?: () => void;
}

export const FinishedModal: React.FC<FinishedModalProps> = ({ open, onClose, onView }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md card-magical animate-scale-in">
        <button
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <FileText className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Comic Book Finished! 🎉</h3>
          <p className="text-muted-foreground mt-1">Your magical book is ready to view.</p>
        </div>
        <div className="flex gap-3">
          {onView && (
            <button className="flex-1 btn-magic" onClick={onView}>View PDF</button>
          )}
          <button
            className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-muted-foreground font-semibold hover:border-foreground transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
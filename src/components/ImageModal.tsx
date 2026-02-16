import React from 'react';
import { X, Download, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from './ui/dialog';

interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    title?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none sm:rounded-3xl flex flex-col items-center justify-center focus:outline-none [&>button]:hidden">
                <DialogTitle className="sr-only">
                    {title || 'Image Preview'}
                </DialogTitle>
                <div className="relative group p-4">
                    {/* Close button - more prominent and fixed positioning */}
                    <button
                        onClick={onClose}
                        className="absolute top-1 right-1 z-[60] p-2.5 rounded-full bg-white text-primary shadow-2xl hover:bg-white hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-primary/20"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Image container with magical frame */}
                    <div className="book-frame max-w-full max-h-[85vh] overflow-hidden animate-scale-in">
                        <img
                            src={imageUrl}
                            alt={title || "Full size cover"}
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                        />

                        {/* Subtle glow effect behind the image */}
                        <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                    </div>

                    {/* Download button overlay */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={() => window.open(imageUrl, '_blank')}
                            className="btn-magic flex items-center gap-2 shadow-2xl"
                        >
                            <Download className="w-5 h-5" />
                            Download High Res
                        </button>
                    </div>
                </div>

                {title && (
                    <p className="mt-4 text-white font-display text-xl font-bold drop-shadow-lg animate-fade-in">
                        {title}
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
};

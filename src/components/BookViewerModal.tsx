import React from 'react';
import { X, Download, FileText, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { HistoryItem } from '../utils/types';
import { safeOpen } from '../utils/security';
import { getThumbnailUrl, getEmbedUrl } from '../utils/imageUtils';

interface BookViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    book: HistoryItem | null;
}

export const BookViewerModal: React.FC<BookViewerModalProps> = ({ isOpen, onClose, book }) => {
    if (!book) return null;

    const effectiveCoverUrl = getThumbnailUrl(book.thumbnailUrl, 1000);
    const effectiveEmbedUrl = getEmbedUrl(book.pdfUrl);
    const showCoverPanel = book.thumbnailUrl && book.thumbnailUrl !== book.pdfUrl;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-background/95 backdrop-blur-xl border border-border/20 shadow-2xl sm:rounded-3xl flex flex-col overflow-hidden focus:outline-none [&>button]:hidden">

                {/* Header Area */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/10 bg-foreground/5 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl gradient-magic flex items-center justify-center shadow-glow">
                            <FileText className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-display font-bold text-foreground leading-tight">
                                {book.childName}'s Adventure
                            </DialogTitle>
                            <p className="text-sm text-primary font-medium opacity-80 uppercase tracking-wider">
                                {book.themeName} Edition
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => safeOpen(book.pdfDownloadUrl || book.pdfUrl)}
                            className="hidden sm:flex btn-magic px-4 py-2 text-sm items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-all border border-transparent hover:border-border/20"
                            aria-label="Close"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0 relative">
                    {/* Subtle Background Blurs */}
                    <div className="premium-blur top-1/4 -left-20 opacity-10" />
                    <div className="premium-blurBottom bottom-1/4 -right-20 opacity-10" />

                    {/* Left Panel: Cover & Info */}
                    {showCoverPanel && (
                        <div className="md:col-span-4 lg:col-span-3 p-6 border-r border-border/10 bg-foreground/5 flex flex-col items-center justify-center overflow-y-auto">
                            <div className="space-y-6 w-full max-w-[240px]">
                                <div className="book-frame aspect-[3/4] shadow-2xl relative group">
                                    <img
                                        src={effectiveCoverUrl || ''}
                                        alt="Cover Preview"
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                    <button
                                        onClick={() => safeOpen(book.coverDownloadUrl || book.thumbnailUrl)}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 text-primary p-2 rounded-lg shadow-lg hover:scale-105 border border-border/50"
                                        title="Download Cover"
                                    >
                                        <Image className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="text-center space-y-2">
                                    <p className="text-sm font-semibold text-foreground/70 uppercase tracking-widest flex items-center justify-center gap-2">
                                        <span className="text-lg">{book.themeEmoji}</span>
                                        Story Details
                                    </p>
                                    <div className="p-3 rounded-xl bg-foreground/5 border border-border/10 text-xs text-muted-foreground space-y-1">
                                        <p>Created: {new Date(book.timestamp).toLocaleDateString()}</p>
                                        <p>Child: {book.childName}</p>
                                        <p>Theme: {book.themeName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Panel: PDF Viewer */}
                    <div className={showCoverPanel ? "md:col-span-8 lg:col-span-9 h-full bg-secondary/20 relative" : "md:col-span-12 h-full bg-secondary/20 relative"}>
                        <iframe
                            src={effectiveEmbedUrl ? `${effectiveEmbedUrl}#toolbar=0&navpanes=0&view=FitH` : ''}
                            className="w-full h-full"
                            title="Book Full Viewer"
                        />

                        {/* Mobile Download Button */}
                        <div className="sm:hidden absolute bottom-4 right-4">
                            <button
                                onClick={() => safeOpen(book.pdfDownloadUrl || book.pdfUrl)}
                                className="btn-magic w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-2xl"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

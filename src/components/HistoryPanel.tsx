import React from 'react';
import { Clock, Download, Trash2, Image, Maximize2, ExternalLink, RotateCcw, Ghost } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { useBookStore } from '../store/bookStore';
import { formatDistanceToNow } from 'date-fns';
import { HistoryItem } from '../utils/types';
import { BookViewerModal } from './BookViewerModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useToast } from '../hooks/use-toast';
import { safeOpen } from '../utils/security';
import { getThumbnailUrl, forceDownload } from '../utils/imageUtils';
import { sanitizeFileName } from '../utils/pdfGenerator';

export const HistoryPanel: React.FC = () => {
  const {
    history,
    deletedHistory,
    removeFromHistory,
    restoreFromHistory,
    permanentlyDeleteFromHistory,
    clearHistory,
    clearDeletedHistory
  } = useHistoryStore();
  const { loadBook, activeGenerations, childName, selectedTheme, processedPhoto, resetAll } = useBookStore();
  const { toast } = useToast();
  const [viewingBook, setViewingBook] = React.useState<HistoryItem | null>(null);
  const [view, setView] = React.useState<'active' | 'trash'>('active');
  const [confirmConfig, setConfirmConfig] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    actionLabel: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => { },
    actionLabel: 'Confirm',
  });

  const confirm = (config: Omit<typeof confirmConfig, 'isOpen'>) => {
    setConfirmConfig({ ...config, isOpen: true });
  };

  const handleCardClick = (item: HistoryItem) => {
    setViewingBook(item);
    // Also load it into store for quick access if they close modal
    loadBook(item);
    console.log('📖 Viewing book from history:', item.childName);
  };

  // Component logic moved into the main return to support tabs
  return (
    <div className="card-magical">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">My Library</h2>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 p-1 bg-secondary/30 rounded-lg">
          <button
            onClick={() => setView('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${view === 'active'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            aria-label={`Show ${history.length} active books in library`}
          >
            <Clock className="w-3.5 h-3.5" />
            Recent
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${view === 'active' ? 'bg-primary-foreground/20' : 'bg-secondary'
              }`}>
              {history.length}
            </span>
          </button>
          <button
            onClick={() => setView('trash')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${view === 'trash'
              ? 'bg-destructive/80 text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            aria-label={`Show ${deletedHistory.length} deleted books in trash`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Trash
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${view === 'trash' ? 'bg-primary-foreground/20' : 'bg-secondary'
              }`}>
              {deletedHistory.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {Object.keys(activeGenerations).length > 0 && (
            <button
              onClick={() => confirm({
                title: "Cancel all active magic?",
                description: "This will stop tracking all current book generations. The process on the server may still continue, but you won't see them here.",
                actionLabel: "Reset All",
                isDestructive: true,
                onConfirm: () => {
                  resetAll();
                  toast({
                    title: "Magic Reset",
                    description: "All active generation trackers have been cleared.",
                  });
                },
              })}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/5 flex items-center gap-1"
              title="Clear all active generations"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
          )}

          {view === 'active' ? (
            history.length > 0 && (
              <button
                onClick={() => confirm({
                  title: "Clear all active books?",
                  description: "This will move all your current books to the trash. You can still restore them later.",
                  actionLabel: "Clear all",
                  onConfirm: () => {
                    clearHistory();
                    toast({
                      title: "History Cleared",
                      description: "All books have been moved to the trash.",
                    });
                  },
                })}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/5"
              >
                Clear active
              </button>
            )
          ) : (
            deletedHistory.length > 0 && (
              <button
                onClick={() => confirm({
                  title: "Empty Trash?",
                  description: "This will permanently delete all books in your trash. This action cannot be undone.",
                  actionLabel: "Empty Trash",
                  isDestructive: true,
                  onConfirm: () => {
                    clearDeletedHistory();
                    toast({
                      title: "Trash Emptied",
                      description: "All deleted books have been permanently removed.",
                      variant: "destructive",
                    });
                  },
                })}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/5"
              >
                Empty trash
              </button>
            )
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {view === 'active' ? (
          <>
            {Object.values(activeGenerations).map((gen) => (
              <div key={gen.id} className="flex flex-col gap-2 p-3 rounded-xl bg-primary/5 border-2 border-primary/20 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                    <span className="text-xl">{gen.theme.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-primary text-sm truncate">
                      {gen.childName}'s {gen.theme.name}
                    </h4>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-primary/60 font-medium uppercase tracking-tighter">
                        {gen.status === 'failed' 
                          ? 'Magic Failed' 
                          : gen.status === 'completed' 
                            ? 'Magic Complete! ✨' 
                            : 'Creating Magic...'}
                      </p>
                      {gen.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {gen.status === 'failed' ? (
                  <p className="text-[10px] text-destructive font-medium px-1">{gen.error || 'Unknown error'}</p>
                ) : (
                  <div className="w-full h-1 bg-primary/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${gen.status === 'completed' ? 'bg-success' : 'bg-primary/40 animate-pulse-slow'}`} 
                      style={{ width: '100%' }} 
                    />
                  </div>
                )}
              </div>
            ))}

            {history.length === 0 && Object.keys(activeGenerations).length === 0 ? (
              <div className="text-center py-10 opacity-60">
                <div className="text-3xl mb-2">📚</div>
                <p className="text-sm font-medium">Your library is empty</p>
                <p className="text-[11px] text-muted-foreground">New books will appear here</p>
              </div>
            ) : (
              history.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  onRemove={() => {
                    removeFromHistory(item.id);
                    toast({
                      title: "Moved to Trash",
                      description: `"${item.childName}'s Adventure" can be restored from the Trash tab.`,
                    });
                  }}
                  onClick={() => handleCardClick(item)}
                />
              ))
            )}
          </>
        ) : (
          deletedHistory.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <Ghost className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Trash is empty</p>
              <p className="text-[11px] text-muted-foreground">Deleted books stay here for a while</p>
            </div>
          ) : (
            deletedHistory.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                isTrash
                onRemove={() => confirm({
                  title: "Permanently delete this book?",
                  description: `Are you sure you want to delete "${item.childName}'s Adventure"? This action cannot be undone.`,
                  actionLabel: "Delete Forever",
                  isDestructive: true,
                  onConfirm: () => {
                    permanentlyDeleteFromHistory(item.id);
                    toast({
                      title: "Book Deleted",
                      description: "The book has been permanently removed.",
                      variant: "destructive",
                    });
                  },
                })}
                onRestore={() => {
                  restoreFromHistory(item.id);
                  toast({
                    title: "Book Restored",
                    description: "The book is back in your library.",
                  });
                }}
                onClick={() => { }} // No click in trash
              />
            ))
          )
        )}
      </div>

      <BookViewerModal
        isOpen={!!viewingBook}
        onClose={() => setViewingBook(null)}
        book={viewingBook}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmConfig.isOpen} onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent className="max-w-[400px] bg-background/95 backdrop-blur-xl border-border/20 shadow-2xl rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">{confirmConfig.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {confirmConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border/10 hover:bg-foreground/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmConfig.onConfirm}
              className={`rounded-xl px-6 ${confirmConfig.isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
            >
              {confirmConfig.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface HistoryCardProps {
  item: HistoryItem;
  onRemove: () => void;
  onRestore?: () => void;
  onClick: () => void;
  isTrash?: boolean;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, onRemove, onRestore, onClick, isTrash }) => {
  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true });

  const handleDownloadPDF = () => {
    const url = item.pdfDownloadUrl || item.pdfUrl;
    if (url) {
      const fileName = `${sanitizeFileName(item.childName)}_${sanitizeFileName(item.themeName)}_story.pdf`;
      forceDownload(url, fileName);
    }
  };

  const handleDownloadCover = () => {
    const url = item.coverDownloadUrl || item.thumbnailUrl;
    if (url) {
      const fileName = `${sanitizeFileName(item.childName)}_${sanitizeFileName(item.themeName)}_cover.jpg`;
      forceDownload(url, fileName);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all group/card relative border-2 border-transparent ${isTrash
        ? 'bg-secondary/30 grayscale-[0.5] opacity-80 cursor-default'
        : 'bg-secondary/50 hover:bg-secondary cursor-pointer hover:border-primary/20 hover:shadow-md'
        }`}
      onClick={!isTrash ? onClick : undefined}
    >
      {item.thumbnailUrl ? (
        <div className="relative group/img">
          <img
            src={getThumbnailUrl(item.thumbnailUrl, 100) || ''}
            alt=""
            className="w-12 h-12 rounded-lg object-cover ring-2 ring-transparent group-hover/img:ring-primary/50 transition-all shadow-sm"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
          {item.themeEmoji}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
          {item.childName}'s {item.themeName}
        </h4>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>

      <div className="flex items-center gap-1 opacity-100 transition-opacity">
        {!isTrash && (
          <>
            {/* Load/View Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors hidden group-hover/card:block"
              title="Re-view Content"
            >
              <ExternalLink className="w-4 h-4 text-primary" />
            </button>
            {/* Download PDF Button */}
            {(item.pdfUrl || item.pdfDownloadUrl) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPDF();
                }}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                title="Download Story"
              >
                <Download className="w-4 h-4 text-primary" />
              </button>
            )}

            {/* Download Cover Button */}
            {(item.thumbnailUrl || item.coverDownloadUrl) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadCover();
                }}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                title="Download Cover"
              >
                <Image className="w-4 h-4 text-primary" />
              </button>
            )}
          </>
        )}

        {isTrash && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore?.();
            }}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            title="Restore Book"
          >
            <RotateCcw className="w-4 h-4 text-primary" />
          </button>
        )}

        {/* Remove/Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
          title={isTrash ? "Permanently Delete" : "Move to Trash"}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    </div>
  );
};

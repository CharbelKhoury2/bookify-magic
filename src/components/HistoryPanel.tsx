import React from 'react';
import { Clock, Download, Trash2, Image, Maximize2, ExternalLink, RotateCcw, Ghost } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { useBookStore } from '../store/bookStore';
import { formatDistanceToNow } from 'date-fns';
import { HistoryItem } from '../utils/types';
import { BookViewerModal } from './BookViewerModal';

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
  const { loadBook } = useBookStore();
  const [viewingBook, setViewingBook] = React.useState<HistoryItem | null>(null);
  const [view, setView] = React.useState<'active' | 'trash'>('active');

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
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted-foreground hover:bg-secondary/50'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Recent
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${view === 'active' ? 'bg-white/20' : 'bg-secondary'
              }`}>
              {history.length}
            </span>
          </button>
          <button
            onClick={() => setView('trash')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${view === 'trash'
              ? 'bg-destructive/80 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-secondary/50'
              }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Trash
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${view === 'trash' ? 'bg-white/20' : 'bg-secondary'
              }`}>
              {deletedHistory.length}
            </span>
          </button>
        </div>

        {view === 'active' ? (
          history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/5"
            >
              Clear active
            </button>
          )
        ) : (
          deletedHistory.length > 0 && (
            <button
              onClick={clearDeletedHistory}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/5"
            >
              Empty trash
            </button>
          )
        )}
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {view === 'active' ? (
          history.length === 0 ? (
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
                onRemove={() => removeFromHistory(item.id)}
                onClick={() => handleCardClick(item)}
              />
            ))
          )
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
                onRemove={() => permanentlyDeleteFromHistory(item.id)}
                onRestore={() => restoreFromHistory(item.id)}
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
      window.open(url, '_blank');
      console.log('📥 Downloading PDF from history:', url);
    }
  };

  const handleDownloadCover = () => {
    const url = item.coverDownloadUrl || item.thumbnailUrl;
    if (url) {
      window.open(url, '_blank');
      console.log('📥 Downloading cover from history:', url);
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
            src={item.thumbnailUrl}
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

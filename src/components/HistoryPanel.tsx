import React from 'react';
import { Clock, Download, Trash2, Image, Maximize2, ExternalLink } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { useBookStore } from '../store/bookStore';
import { formatDistanceToNow } from 'date-fns';
import { HistoryItem } from '../utils/types';
import { BookViewerModal } from './BookViewerModal';

export const HistoryPanel: React.FC = () => {
  const { history, removeFromHistory, clearHistory } = useHistoryStore();
  const { loadBook } = useBookStore();
  const [viewingBook, setViewingBook] = React.useState<HistoryItem | null>(null);

  const handleCardClick = (item: HistoryItem) => {
    setViewingBook(item);
    // Also load it into store for quick access if they close modal
    loadBook(item);
    console.log('📖 Viewing book from history:', item.childName);
  };

  if (history.length === 0) {
    return (
      <div className="card-magical">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Recent Books</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-3 opacity-50">📚</div>
          <p className="text-muted-foreground text-sm">
            Your created books will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-magical">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Recent Books</h2>
          <span className="text-xs text-muted-foreground">({history.length} saved)</span>
        </div>
        <button
          onClick={clearHistory}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {history.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            onRemove={() => removeFromHistory(item.id)}
            onClick={() => handleCardClick(item)}
          />
        ))}
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
  onClick: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, onRemove, onClick }) => {
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
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary cursor-pointer transition-all group relative border-2 border-transparent hover:border-primary/20 hover:shadow-md"
      onClick={onClick}
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
        {/* Load/View Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="p-2 hover:bg-primary/10 rounded-lg transition-colors hidden group-hover:block"
          title="Re-view Content"
        >
          <ExternalLink className="w-4 h-4 text-primary" />
        </button>
        {/* Download PDF Button */}
        {(item.pdfUrl || item.pdfDownloadUrl) && (
          <button
            onClick={handleDownloadPDF}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            title="Download Story"
          >
            <Download className="w-4 h-4 text-primary" />
          </button>
        )}

        {/* Download Cover Button */}
        {(item.thumbnailUrl || item.coverDownloadUrl) && (
          <button
            onClick={handleDownloadCover}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            title="Download Cover"
          >
            <Image className="w-4 h-4 text-primary" />
          </button>
        )}

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    </div>
  );
};

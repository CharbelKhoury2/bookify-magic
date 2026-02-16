import React from 'react';
import { Clock, Download, Trash2, Image, Maximize2 } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { formatDistanceToNow } from 'date-fns';
import { ImageModal } from './ImageModal';

export const HistoryPanel: React.FC = () => {
  const { history, removeFromHistory, clearHistory } = useHistoryStore();
  const [selectedImage, setSelectedImage] = React.useState<{ url: string; title: string } | null>(null);

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
            onViewImage={(url, title) => setSelectedImage({ url, title })}
          />
        ))}
      </div>

      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || ''}
        title={selectedImage?.title}
      />
    </div>
  );
};

interface HistoryCardProps {
  item: {
    id: string;
    childName: string;
    themeName: string;
    themeEmoji: string;
    timestamp: number;
    pdfUrl: string;
    thumbnailUrl: string;
    pdfDownloadUrl?: string;
    coverDownloadUrl?: string;
  };
  onRemove: () => void;
  onViewImage: (url: string, title: string) => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, onRemove, onViewImage }) => {
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
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group">
      {item.thumbnailUrl ? (
        <div
          className="relative cursor-zoom-in group/img"
          onClick={() => onViewImage(item.thumbnailUrl, `${item.childName}'s ${item.themeName}`)}
        >
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-12 h-12 rounded-lg object-cover ring-2 ring-transparent group-hover/img:ring-primary/50 transition-all shadow-sm"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
          {item.themeEmoji}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground text-sm truncate">
          {item.childName}'s {item.themeName}
        </h4>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

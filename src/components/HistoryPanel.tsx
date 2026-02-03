import React from 'react';
import { Clock, Download, Trash2, BookOpen } from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { formatDistanceToNow } from 'date-fns';

export const HistoryPanel: React.FC = () => {
  const { items, removeItem, clearHistory } = useHistoryStore();

  if (items.length === 0) {
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
        </div>
        <button
          onClick={clearHistory}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {items.map((item) => (
          <HistoryCard
            key={item.id}
            item={item}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>
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
  };
  onRemove: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({ item, onRemove }) => {
  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true });

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group">
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="w-12 h-12 rounded-lg object-cover"
        />
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
        {item.pdfUrl && (
          <a
            href={item.pdfUrl}
            download={`${item.childName}_${item.themeName}.pdf`}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-primary" />
          </a>
        )}
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

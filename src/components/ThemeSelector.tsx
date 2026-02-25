import React, { useEffect } from 'react';
import { Theme } from '../utils/types';
import { useBookStore } from '../store/bookStore';
import { useThemeStore } from '../store/themeStore';
import { LoadingSpinner } from './LoadingSpinner';

export const ThemeSelector: React.FC = () => {
  const { selectedTheme, setSelectedTheme } = useBookStore();
  const { themes, isLoading, fetchThemes, subscribeToThemes } = useThemeStore();

  useEffect(() => {
    fetchThemes();
    const unsubscribe = subscribeToThemes();
    return () => unsubscribe();
  }, [fetchThemes, subscribeToThemes]);

  const activeThemes = themes.filter(t => t.isActive !== false);

  if (isLoading && themes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground animate-pulse">Loading magical themes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-lg font-semibold text-foreground">
        Choose a Story Theme ✨
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {activeThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedTheme?.id === theme.id}
            onClick={() => setSelectedTheme(theme)}
          />
        ))}
      </div>
      {activeThemes.length === 0 && !isLoading && (
        <div className="p-8 text-center border-2 border-dashed border-border rounded-3xl text-muted-foreground">
          No themes available yet.
        </div>
      )}
    </div>
  );
};

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  onClick: () => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`Select ${theme.name} theme: ${theme.description}`}
      className={`
        relative p-4 rounded-2xl border-2 transition-all duration-300
        hover:scale-105 hover:shadow-float
        ${isSelected
          ? 'border-primary bg-primary/10 shadow-glow'
          : 'border-border bg-card hover:border-primary/50'
        }
      `}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-scale-in">
          <span className="text-primary-foreground text-xs">✓</span>
        </div>
      )}
      <div className="text-3xl mb-2 animate-bounce-gentle">{theme.emoji}</div>
      <h3 className="font-bold text-foreground text-sm">{theme.name}</h3>
      <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
      <div className="flex gap-1 mt-3 justify-center">
        {Object.values(theme.colors).slice(0, 4).map((color, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border border-border/50"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </button>
  );
};

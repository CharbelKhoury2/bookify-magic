import { BookGenerator } from './components/BookGenerator';
import { HistoryPanel } from './components/HistoryPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BookOpen } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen gradient-dreamy py-8 px-4 sm:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-10 sm:mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-magic shadow-glow mb-6 animate-float">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gradient-magic mb-4">
            Personalized Book Generator
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            Create magical, personalized storybooks for your child in seconds! ✨
          </p>
        </header>

        {/* Main Content */}
        <ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2">
              <BookGenerator />
            </div>
            <div className="lg:sticky lg:top-8 lg:self-start">
              <HistoryPanel />
            </div>
          </div>
        </ErrorBoundary>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>Made with 💜 for little readers everywhere</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

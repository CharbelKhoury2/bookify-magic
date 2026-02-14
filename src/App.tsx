import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { BookGenerator } from './components/BookGenerator';
import { HistoryPanel } from './components/HistoryPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { BookOpen, User, LogOut } from 'lucide-react';
import Auth from './pages/Auth';

function HomePage() {
  const { user, loading, signOut } = useAuth();

  return (
    <div className="min-h-screen gradient-dreamy py-8 px-4 sm:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-10 sm:mb-12 animate-fade-in">
          <div className="flex justify-end mb-4">
            {loading ? (
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-magic text-primary-foreground font-semibold hover:scale-105 transition-transform"
              >
                <User className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

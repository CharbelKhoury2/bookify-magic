import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { BookGenerator } from './components/BookGenerator';
import { HistoryPanel } from './components/HistoryPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { BookOpen, User, LogOut, ShieldCheck, RotateCcw } from 'lucide-react';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import { ThemeProvider } from './components/ThemeProvider';
import { DarkModeToggle } from './components/DarkModeToggle';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useBookStore } from './store/bookStore';
import { useHistoryStore } from './store/historyStore';
import { useToast } from './hooks/use-toast';

function HomePage() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const { resetAll } = useBookStore();
  const { clearHistory, clearDeletedHistory } = useHistoryStore();
  const { toast } = useToast();

  const handleMasterReset = () => {
    if (window.confirm('🚨 MASTER RESET: Are you sure you want to clear EVERYTHING? (Form data, active generations, and library history will be lost)')) {
      resetAll();
      clearHistory();
      clearDeletedHistory();
      toast({
        title: "Magic Reset Complete",
        description: "All application data and history have been cleared.",
      });
    }
  };

  return (
    <div className="min-h-screen gradient-dreamy py-8 px-4 sm:py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-10 sm:mb-12 animate-fade-in">
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-3">
              <DarkModeToggle />
              <div className="flex items-center gap-1 border-2 border-border/50 rounded-2xl p-1 bg-card/50 backdrop-blur-sm shadow-sm">
                <button
                  onClick={handleMasterReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-transparent hover:border-destructive/20 text-muted-foreground hover:text-destructive transition-all group"
                  title="Master Reset Everything"
                >
                  <RotateCcw className="w-4 h-4 transition-transform group-hover:rotate-[-180deg] duration-500" />
                  <span className="hidden lg:inline font-bold text-sm">Reset Everything</span>
                </button>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-glow transition-all font-bold text-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}
                <span className="text-sm font-semibold text-muted-foreground px-4 hidden sm:block">
                  {user?.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-transparent hover:border-destructive/20 text-muted-foreground hover:text-destructive transition-all group"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span className="hidden lg:inline font-bold text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-magic shadow-glow mb-6 animate-float">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gradient-magic mb-4">
            Wonder Wraps LB
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            Personalized children's storybooks where your child is the hero! ✨
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
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-dreamy flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-primary font-medium animate-pulse">Entering the magical world...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <HomePage /> : <Auth />} />
          <Route path="/auth" element={user ? <HomePage /> : <Auth />} />
          <Route
            path="/admin"
            element={user && isAdmin ? <Admin /> : <HomePage />}
          />
          <Route path="*" element={<Link to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </ThemeProvider>
  );
}

export default App;

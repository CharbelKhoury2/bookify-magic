import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Mail, Lock, User, Sparkles, Star, Eye, EyeOff } from 'lucide-react';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Checkbox } from '@/components/ui/checkbox';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();

  // Load saved credentials on mount
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('magic_remember_email');
    const savedRemember = localStorage.getItem('magic_remember_me') === 'true';

    if (savedRemember && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Handle "Remember Me"
        if (rememberMe) {
          localStorage.setItem('magic_remember_email', email);
          localStorage.setItem('magic_remember_me', 'true');
        } else {
          localStorage.removeItem('magic_remember_email');
          localStorage.setItem('magic_remember_me', 'false');
        }

        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setMessage({
          text: 'Check your email to confirm your account!',
          type: 'success',
        });
      }
    } catch (error: any) {
      setMessage({
        text: error.message || 'An error occurred',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dreamy flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <DarkModeToggle />
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-20 left-10 text-primary/20 animate-float-slow">
        <Sparkles className="w-12 h-12" />
      </div>
      <div className="absolute bottom-20 right-10 text-accent/20 animate-float">
        <Star className="w-16 h-16" />
      </div>
      <div className="absolute top-1/4 right-20 text-secondary/20 animate-pulse">
        <Star className="w-8 h-8" />
      </div>
      <div className="premium-blur top-1/4 -left-20 opacity-20" />
      <div className="premium-blurBottom bottom-1/4 -right-20 opacity-20" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Branding */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-magic shadow-glow mb-6 animate-float">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold text-gradient-magic">
            Wonder Wraps LB
          </h1>
          <p className="text-muted-foreground mt-3 font-medium">
            Where your stories come to life ✨
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-card p-8 sm:p-10 rounded-3xl animate-scale-in relative">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin
                ? 'Sign in to access your magical library'
                : 'Join us to start creating your child\'s adventure'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2 ml-1">
                <Mail className="w-4 h-4 text-primary/70" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="magic@story.com"
                required
                className="w-full px-5 py-3.5 rounded-2xl border-2 border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 flex items-center gap-2 ml-1">
                <Lock className="w-4 h-4 text-primary/70" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-border/50 bg-background/50 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all duration-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 rounded-xl"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center space-x-2 ml-1">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-primary/50 data-[state=checked]:bg-primary"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium text-muted-foreground cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </label>
              </div>
            )}

            {/* Error/Success Messages */}
            {message && (
              <div
                className={`p-4 rounded-2xl text-sm flex items-center gap-3 animate-shake ${message.type === 'success'
                  ? 'bg-success/10 text-success border border-success/30'
                  : 'bg-destructive/10 text-destructive border border-destructive/30'
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-magic py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:shadow-primary/30 transition-all duration-300 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <User className="w-5 h-5" />
                  <span className="font-bold">{isLogin ? 'Enter Magical Library' : 'Create My Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm font-medium">
              {isLogin ? "New to the magic?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setMessage(null);
                }}
                className="ml-2 text-primary font-bold hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center mt-10 text-xs text-muted-foreground opacity-60">
          Securely powered by Supabase Auth &copy; 2024 Wonder Wraps LB
        </p>
      </div>
    </div>
  );
}

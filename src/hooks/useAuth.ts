import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { AppRole } from '@/utils/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
        setRole('user');
      } else {
        setRole(data.role as AppRole);
      }
    } catch (err) {
      setRole('user');
    }
  };

  useEffect(() => {
    // Safety timeout: If auth takes more than 5 seconds, stop loading anyway
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
      console.warn('Auth loading timed out. Proceeding with caution...');
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRole(session.user.id); // Don't await here to avoid blocking UI
        } else {
          setRole(null);
        }
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id); // Don't await here to avoid blocking UI
      }
      setLoading(false);
      clearTimeout(safetyTimeout);
    }).catch(err => {
      console.error('Session check failed:', err);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = role === 'admin';

  return { user, session, role, isAdmin, loading, signOut };
}

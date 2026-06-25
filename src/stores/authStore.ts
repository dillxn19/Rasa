import { create } from 'zustand';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthState {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  setSession: (session: Session | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  session: null,
  supabaseUser: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setSession: (session) => set({
    session,
    supabaseUser: session?.user ?? null,
  }),

  setProfile: (profile) => set({ profile }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ session, supabaseUser: session.user });

        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single();

        set({ profile: profile as User | null });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        set({ session: newSession, supabaseUser: newSession?.user ?? null });

        if (event === 'SIGNED_IN' && newSession?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', newSession.user.id)
            .single();
          set({ profile: profile as User | null });
        } else if (event === 'SIGNED_OUT') {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ error: 'Failed to initialize auth' });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, supabaseUser: null, profile: null });
  },

  refreshProfile: async () => {
    const { supabaseUser } = get();
    if (!supabaseUser) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', supabaseUser.id)
      .single();

    if (data) set({ profile: data as User });
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (error) throw error;
    if (data) set({ profile: data as User });
  },
}));

// Selectors
export const selectIsAuthenticated = (s: AuthState) => !!s.session;
export const selectCurrentUser = (s: AuthState) => s.profile;
export const selectCurrentUserId = (s: AuthState) => s.profile?.id;
export const selectOnboardingCompleted = (s: AuthState) => s.profile?.onboarding_completed ?? false;

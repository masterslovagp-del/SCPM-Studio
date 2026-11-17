/* SCPM Studio — Supabase client/auth */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://trrokzwtgsgxucmazqji.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_V2B9L9TJgbOztH6rQy4HbQ_v_ntrPwv';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[SCPM Auth] Supabase CDN did not load.');
    window.scpmAuthError = 'Supabase library failed to load.';
    return;
  }

  window.scpmSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );

  window.scpmAuth = {
    client: window.scpmSupabase,
    async session() {
      const { data, error } = await window.scpmSupabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    async signUp(email, password) {
      return window.scpmSupabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/account.html' }
      });
    },
    async signIn(email, password) {
      return window.scpmSupabase.auth.signInWithPassword({ email, password });
    },
    async signOut() {
      return window.scpmSupabase.auth.signOut();
    }
  };

  console.log('[SCPM Auth] Supabase connected:', SUPABASE_URL);
})();

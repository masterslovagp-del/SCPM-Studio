/* SCPM Studio — Account page */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  function message(text, isError) {
    const el = $('accountMessage');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', !!isError);
  }

  function setAuthVisible(loggedIn) {
    if ($('authPanel')) $('authPanel').hidden = loggedIn;
    if ($('profilePanel')) $('profilePanel').hidden = !loggedIn;
  }

  async function loadProfile(user) {
    if (!window.scpmSupabase || !user) return;
    
    try {
      const { data, error } = await window.scpmSupabase
        .from('profiles')
        .select('email,wallet_address,nickname')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      
      if ($('userEmail')) $('userEmail').textContent = user.email || data?.email || '—';
      if ($('userNickname')) $('userNickname').textContent = data?.nickname || 'Не задан';
      if ($('nicknameInput') && data?.nickname) $('nicknameInput').value = data.nickname;
      
      if ($('walletValue')) {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem('scpm_eth_wallet_' + user.id) || 'null'); } catch (_) {}
        $('walletValue').textContent = data?.wallet_address || (saved && saved.address) || 'Not connected';
      }
    } catch (e) {
      console.warn('[SCPM Account] Profile read error:', e);
      if ($('userNickname')) $('userNickname').textContent = '—';
    }
  }

    async function saveNickname() {
    if (!window.scpmSupabase) return message('Ошибка: Supabase не загружен.', true);
    
    const val = $('nicknameInput')?.value.trim();
    if (!val && val !== '') return message('Введите никнейм.', true); // На всякий случай
    
    // Если поле пустое, мы сохраняем null (или пустую строку), чтобы очистить ник в БД
    const newNickname = val ? val : null; 

    if (newNickname && newNickname.length > 20) {
      return message('Никнейм не должен превышать 20 символов.', true);
    }

    try {
      const { data: { session }, error: sessionError } = await window.scpmSupabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) return message('Сначала войдите в аккаунт.', true);
      
      const { error } = await window.scpmSupabase
        .from('profiles')
        .update({ nickname: newNickname })
        .eq('id', session.user.id);

      if (error) throw error;
      message(newNickname ? 'Никнейм сохранен!' : 'Никнейм удален.');
      await loadProfile(session.user);
    } catch (e) {
      message('Ошибка сохранения: ' + e.message, true);
    }
  }

  async function ensureProfile(user) {
    try {
      await window.scpmSupabase.from('profiles').upsert({
        id: user.id,
        email: user.email || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {}
  }

  async function refresh() {
    if (!window.scpmSupabase) {
      setAuthVisible(false);
      message('Библиотека Supabase не загружена. Проверьте AdBlock или интернет.', true);
      return;
    }
    try {
      const { data: { session }, error } = await window.scpmSupabase.auth.getSession();
      if (error) throw error;
      
      if (!session?.user) {
        setAuthVisible(false);
        return;
      }
      setAuthVisible(true);
      await ensureProfile(session.user);
      await loadProfile(session.user);
    } catch (e) {
      console.error(e);
      message(e.message || 'Authentication error.', true);
    }
  }

  async function signup() {
    if (!window.scpmSupabase) return message('Ошибка: Supabase не загружен.', true);
    
    const email = $('email')?.value.trim();
    const password = $('password')?.value || '';
    if (!email || !password) return message('Enter email and password.', true);
    if (password.length < 6) return message('Password must be at least 6 characters.', true);
    message('Creating account…');
    
    try {
      const { data, error } = await window.scpmSupabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + '/account.html' }
      });
      if (error) throw error;
      
      if (data.session) {
        message('Account created. You are signed in.');
        await refresh();
      } else {
        message('Account created. Check your email and confirm the address before signing in.');
      }
    } catch (e) {
      message(e.message || 'Could not create account.', true);
    }
  }

  async function login(ev) {
    ev.preventDefault();
    if (!window.scpmSupabase) {
      return message('Ошибка: библиотека Supabase не загружена. Проверьте AdBlock или интернет.', true);
    }
    
    const email = $('email')?.value.trim();
    const password = $('password')?.value || '';
    message('Signing in…');
    
    try {
      const { error } = await window.scpmSupabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      message('Signed in.');
      await refresh();
    } catch (e) {
      message(e.message || 'Could not sign in.', true);
    }
  }

  async function logout() {
    if (!window.scpmSupabase) return;
    try { 
      await window.scpmSupabase.auth.signOut(); 
      message('Signed out.'); 
      setAuthVisible(false); 
    }
    catch (e) { 
      message(e.message || 'Could not sign out.', true); 
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if ($('loginForm')) $('loginForm').addEventListener('submit', login);
    if ($('signupBtn')) $('signupBtn').addEventListener('click', signup);
    if ($('logoutBtn')) $('logoutBtn').addEventListener('click', logout);
    if ($('saveNicknameBtn')) $('saveNicknameBtn').addEventListener('click', saveNickname);
    refresh();
    if (window.scpmSupabase) {
      window.scpmSupabase.auth.onAuthStateChange(() => refresh());
    }
  });
})();
/* ═══════════════════════════════════════════════════════
   Albexia — albexia.js  (fichier unique)
   Gère : Supabase, Auth Google, Nav avatar,
          Index (outils/blog/galerie/quiz/collections),
          Profile (favoris, collections, historique, notifs)
   Usage :
     index.html   → <script src="js/albexia.js"></script>
     profile.html → <script src="js/albexia.js"></script>
     auth.html    → <script src="js/albexia.js"></script>
   ═══════════════════════════════════════════════════════ */

(async function () {
  'use strict';

  /* ════════════════════════════════════════
     1. CHARGER SUPABASE (UMD)
  ════════════════════════════════════════ */
  await new Promise((resolve, reject) => {
    if (window.supabase && window.supabase.createClient) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const SUPABASE_URL  = 'https://cqjmczfjzosnnrlmfbmm.supabase.co';
  const SUPABASE_ANON = 'sb_publishable_L7WRDMPd0mfYo7YC49cxsA_lz62Bb10';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  /* Exposer globalement pour compatibilité */
  window._supabase = sb;

  /* ════════════════════════════════════════
     2. AUTH
  ════════════════════════════════════════ */
  const IS_PROFILE = document.getElementById('profile-main') !== null;
  const IS_AUTH    = document.getElementById('btn-login')    !== null;
  const IS_INDEX   = !IS_PROFILE && !IS_AUTH;

  async function getSession() {
    const { data: { session } } = await sb.auth.getSession();
    return session;
  }

  async function signOut() {
    await sb.auth.signOut();
    window.location.href = 'index.html';
  }

  async function signInWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/profile.html' }
    });
    if (error) console.error('Google OAuth:', error.message);
  }

  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, username) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } });
    if (error) throw error;
    if (data.user) {
      await sb.from('profiles').upsert({
        id: data.user.id,
        username: username || email.split('@')[0],
        email
      }, { onConflict: 'id' });
    }
    return data;
  }

  /* Exposer pour auth.html (inline handlers) */
  window._auth = { signIn, signUp, signInWithGoogle, sb };

  /* ════════════════════════════════════════
     3. PROFIL SUPABASE
  ════════════════════════════════════════ */
  async function ensureProfile(user) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (!error && data) return data;
    const username = user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email?.split('@')[0]
      || 'utilisateur';
    const { data: created } = await sb.from('profiles')
      .upsert({ id: user.id, username, email: user.email }, { onConflict: 'id' })
      .select().single();
    return created || { username, email: user.email };
  }

  /* ════════════════════════════════════════
     4. NAV AVATAR (toutes les pages)
  ════════════════════════════════════════ */
  async function initNav(user, profile) {
    const slot = document.querySelector('.nav-profile-slot');
    if (!slot) return;

    if (!user) {
      slot.innerHTML = `<a href="auth.html" class="btn-nav-auth">Connexion</a>`;
      return;
    }

    const initial = (profile?.username || user.email || '?')[0].toUpperCase();
    slot.innerHTML = `
      <div class="nav-avatar-wrap" id="nav-avatar-wrap">
        <button class="nav-avatar" id="nav-avatar-btn" aria-label="Mon compte">${initial}</button>
        <div class="nav-avatar-menu" id="nav-avatar-menu">
          <div class="nav-avatar-name">${profile?.username || user.email}</div>
          <a href="profile.html"               class="nav-avatar-item">👤 Mon profil</a>
          <a href="profile.html#favorites"     class="nav-avatar-item">❤️ Favoris</a>
          <a href="profile.html#collections"   class="nav-avatar-item">📁 Collections</a>
          <a href="profile.html#history"       class="nav-avatar-item">🕒 Historique</a>
          <a href="profile.html#notifications" class="nav-avatar-item">🔔 Notifications</a>
          <div class="nav-avatar-divider"></div>
          <button class="nav-avatar-item" id="nav-logout-btn">🚪 Déconnexion</button>
        </div>
      </div>`;

    const btn  = document.getElementById('nav-avatar-btn');
    const menu = document.getElementById('nav-avatar-menu');
    btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', () => menu.classList.remove('open'));
    menu.addEventListener('click', e => e.stopPropagation());
    document.getElementById('nav-logout-btn').addEventListener('click', signOut);
  }

  /* ════════════════════════════════════════
     5. TOOLS MAP (tools.json)
  ════════════════════════════════════════ */
  let toolsMap = {};

  async function loadToolsMap() {
    if (Object.keys(toolsMap).length > 0) return;
    try {
      const res  = await fetch('data/tools.json');
      const data = await res.json();
      data.forEach(t => {
        toolsMap[String(t.id)] = t;
        if (t.slug) toolsMap[t.slug] = t;
      });
    } catch (e) { console.warn('tools.json:', e); }
  }

  const toolName     = id => toolsMap[String(id)]?.name     || id;
  const toolCategory = id => toolsMap[String(id)]?.category || '';
  const toolUrl      = id => toolsMap[String(id)]?.page || toolsMap[String(id)]?.url || '#';

  /* ════════════════════════════════════════
     6. HELPERS UI
  ════════════════════════════════════════ */
  function setEl(id, text)  { const e = document.getElementById(id); if (e) e.textContent = text; }
  function setVal(id, val)  { const e = document.getElementById(id); if (e) e.value = val; }
  function setCount(id, n)  { const e = document.getElementById(id); if (e) e.textContent = n; }

  function showToast(msg) {
    /* Toast profile */
    const t = document.createElement('div');
    t.className = 'profile-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('visible'), 10);
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 3000);
  }

  /* ════════════════════════════════════════
     7. PAGE PROFIL
  ════════════════════════════════════════ */
  async function initProfile(user, profile) {
    let favoritesData   = [];
    let collectionsData = [];
    let historyData     = [];
    let notificationsData = [];

    /* Affichage header profil */
    const username = profile?.username || user.email?.split('@')[0] || '—';
    const initial  = username[0].toUpperCase();
    setEl('profile-avatar-display',   initial);
    setEl('profile-username-display', username);
    setEl('profile-email-display',    profile?.email || user.email || '—');
    setEl('dash-username',            username);
    setVal('settings-username',       username);
    setVal('settings-email',          profile?.email || user.email || '');

    /* ── Favoris ── */
    async function loadFavorites() {
      const { data } = await sb.from('favorites')
        .select('tool_id, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false });
      favoritesData = data || [];
      setCount('stat-favorites',      favoritesData.length);
      setCount('nav-count-favorites', favoritesData.length);
      setCount('dash-fav-count',      favoritesData.length);
      renderFavorites();
    }

    function renderFavorites() {
      const el = document.getElementById('favorites-list');
      if (!el) return;
      if (!favoritesData.length) {
        el.innerHTML = '<p class="empty-state">Aucun favori.<br>Cliquez sur ❤️ sur une fiche outil.</p>';
        return;
      }
      el.innerHTML = favoritesData.map(f => `
        <div class="tool-card-mini">
          <div class="tool-card-mini-info">
            <strong>${toolName(f.tool_id)}</strong>
            ${toolCategory(f.tool_id) ? `<span class="tool-cat-badge">${toolCategory(f.tool_id)}</span>` : ''}
          </div>
          <div class="tool-card-mini-actions">
            <a href="${toolUrl(f.tool_id)}" class="btn-ghost btn-xs" target="_blank">Voir →</a>
            <button class="btn-icon btn-fav-remove" data-id="${f.tool_id}" title="Retirer">✕</button>
          </div>
        </div>`).join('');
      el.querySelectorAll('.btn-fav-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
          await sb.from('favorites').delete()
            .eq('user_id', user.id).eq('tool_id', btn.dataset.id);
          await loadFavorites();
          showToast('Retiré des favoris');
        });
      });
    }

    /* ── Collections ── */
    async function loadCollections() {
      const { data } = await sb.from('collections')
        .select('*, collection_tools(tool_id)').eq('user_id', user.id)
        .order('created_at', { ascending: false });
      collectionsData = data || [];
      setCount('stat-collections',      collectionsData.length);
      setCount('nav-count-collections', collectionsData.length);
      setCount('dash-col-count',        collectionsData.length);
      renderCollections();
    }

    function renderCollections() {
      const el = document.getElementById('collections-list');
      if (!el) return;
      if (!collectionsData.length) {
        el.innerHTML = '<p class="empty-state">Aucune collection.</p>';
        return;
      }
      el.innerHTML = collectionsData.map(c => {
        const n = c.collection_tools?.length || 0;
        return `
          <div class="collection-card">
            <div class="collection-card-icon">📁</div>
            <div class="collection-card-info">
              <strong>${c.name}</strong>
              <span>${n} outil${n > 1 ? 's' : ''}</span>
            </div>
            <button class="btn-icon collection-delete" data-id="${c.id}" title="Supprimer">✕</button>
          </div>`;
      }).join('');
      el.querySelectorAll('.collection-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Supprimer cette collection ?')) return;
          await sb.from('collections').delete().eq('id', btn.dataset.id).eq('user_id', user.id);
          await loadCollections();
        });
      });
    }

    /* ── Historique ── */
    async function loadHistory() {
      const { data } = await sb.from('history')
        .select('tool_id, visited_at').eq('user_id', user.id)
        .order('visited_at', { ascending: false }).limit(50);
      historyData = data || [];
      setCount('stat-history',    historyData.length);
      setCount('dash-hist-count', historyData.length);
      renderHistory();
      renderDashRecent();
    }

    function renderHistory() {
      const el = document.getElementById('history-list');
      if (!el) return;
      if (!historyData.length) { el.innerHTML = '<p class="empty-state">Aucun historique.</p>'; return; }
      const groups = {};
      historyData.forEach(h => {
        const date = new Date(h.visited_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        if (!groups[date]) groups[date] = [];
        groups[date].push(h);
      });
      el.innerHTML = Object.entries(groups).map(([date, items]) => `
        <div class="history-group">
          <div class="history-date">${date}</div>
          ${items.map(h => `
            <div class="tool-card-mini">
              <div class="tool-card-mini-info"><strong>${toolName(h.tool_id)}</strong></div>
              <a href="${toolUrl(h.tool_id)}" class="btn-ghost btn-xs" target="_blank">Voir →</a>
            </div>`).join('')}
        </div>`).join('');
    }

    function renderDashRecent() {
      const el = document.getElementById('dash-recent-list');
      if (!el) return;
      const slice = historyData.slice(0, 5);
      if (!slice.length) { el.innerHTML = '<p class="empty-state">Aucun outil consulté.</p>'; return; }
      el.innerHTML = slice.map(h => `
        <a href="${toolUrl(h.tool_id)}" class="dash-recent-item">
          <span class="dash-recent-name">${toolName(h.tool_id)}</span>
          <span class="dash-recent-arrow">→</span>
        </a>`).join('');
    }

    /* ── Notifications ── */
    async function loadNotifications() {
      const { data } = await sb.from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false }).limit(30);
      notificationsData = data || [];
      const unread = notificationsData.filter(n => !n.is_read).length;
      setCount('nav-count-notifs',  unread || '');
      setCount('dash-notif-count',  notificationsData.length);
      renderNotifications();
    }

    function renderNotifications() {
      const el = document.getElementById('notifications-list');
      if (!el) return;
      if (!notificationsData.length) { el.innerHTML = '<p class="empty-state">Aucune notification.</p>'; return; }
      const icons = { info: '🔔', promo: '💰', update: '🔄', news: '📰' };
      el.innerHTML = notificationsData.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'notif-item--unread'}">
          <span class="notif-icon">${icons[n.type] || '🔔'}</span>
          <div class="notif-body">
            <strong class="notif-title">${n.title}</strong>
            ${n.message ? `<p class="notif-msg">${n.message}</p>` : ''}
            <span class="notif-date">${new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          ${!n.is_read ? `<button class="notif-read-btn" data-id="${n.id}">✓</button>` : ''}
        </div>`).join('');
      el.querySelectorAll('.notif-read-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await sb.from('notifications').update({ is_read: true }).eq('id', btn.dataset.id);
          await loadNotifications();
        });
      });
    }

    /* ── Navigation tabs ── */
    window.switchTab = function(tabId) {
      document.querySelectorAll('.profile-nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      const btn = document.querySelector(`[data-tab="${tabId}"]`);
      const tab = document.getElementById(`tab-${tabId}`);
      if (btn) btn.classList.add('active');
      if (tab) tab.classList.add('active');
      history.replaceState(null, '', `#${tabId}`);
    };

    /* ── Events profil ── */
    document.querySelectorAll('.profile-nav-item[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => window.switchTab(btn.dataset.tab));
    });
    document.getElementById('profile-logout-btn')?.addEventListener('click', signOut);
    document.getElementById('btn-google-signin')?.addEventListener('click', signInWithGoogle);

    document.getElementById('btn-new-collection')?.addEventListener('click', () => {
      document.getElementById('collection-form').style.display = 'flex';
      document.getElementById('collection-name-input').focus();
    });
    document.getElementById('btn-cancel-collection')?.addEventListener('click', () => {
      document.getElementById('collection-form').style.display = 'none';
      document.getElementById('collection-name-input').value = '';
    });
    document.getElementById('btn-create-collection')?.addEventListener('click', async () => {
      const name = document.getElementById('collection-name-input').value.trim();
      if (!name) return;
      await sb.from('collections').insert({ user_id: user.id, name });
      document.getElementById('collection-form').style.display = 'none';
      document.getElementById('collection-name-input').value = '';
      await loadCollections();
      showToast('Collection créée ✓');
    });
    document.getElementById('btn-clear-history')?.addEventListener('click', async () => {
      if (!confirm('Vider tout l\'historique ?')) return;
      await sb.from('history').delete().eq('user_id', user.id);
      await loadHistory();
    });
    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
      const uname = document.getElementById('settings-username').value.trim();
      await sb.from('profiles').update({ username: uname }).eq('id', user.id);
      setEl('profile-username-display', uname);
      setEl('dash-username', uname);
      showToast('Profil mis à jour ✓');
    });

    /* ── Chargement initial ── */
    await loadToolsMap();
    await Promise.all([loadFavorites(), loadCollections(), loadHistory(), loadNotifications()]);

    const hash = window.location.hash.replace('#', '');
    if (hash) window.switchTab(hash);
  }

  /* ════════════════════════════════════════
     8. PAGE AUTH
  ════════════════════════════════════════ */
  function initAuth(user) {
    if (user) { window.location.href = 'profile.html'; return; }

    function showMessage(msg, type = 'error') {
      const el = document.getElementById('auth-message');
      if (!el) return;
      el.textContent = msg;
      el.className   = 'auth-message auth-message--' + type;
      el.style.display = 'block';
    }
    function hideMessage() {
      const el = document.getElementById('auth-message');
      if (el) el.style.display = 'none';
    }
    function setLoading(btn, loading) {
      btn.disabled = loading;
      btn.dataset.orig = btn.dataset.orig || btn.textContent;
      btn.textContent  = loading ? '...' : btn.dataset.orig;
    }
    function translateError(msg) {
      if (msg.includes('Invalid login'))       return 'Email ou mot de passe incorrect.';
      if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email.';
      if (msg.includes('already registered')) return 'Un compte existe déjà avec cet email.';
      if (msg.includes('Password should be')) return 'Mot de passe trop court (min. 6 caractères).';
      if (msg.includes('Unable to validate')) return 'Email invalide.';
      if (msg.includes('rate limit'))         return 'Trop de tentatives. Attendez quelques minutes.';
      return 'Une erreur est survenue. Réessayez.';
    }

    /* Onglets */
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form-wrap').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('form-' + tab.dataset.tab).classList.add('active');
        hideMessage();
      });
    });

    /* Mot de passe oublié */
    document.getElementById('forgot-link')?.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.auth-form-wrap').forEach(f => f.classList.remove('active'));
      document.getElementById('form-reset').classList.add('active');
      tabs.forEach(t => t.classList.remove('active'));
    });
    document.getElementById('btn-back-login')?.addEventListener('click', () => {
      document.querySelectorAll('.auth-form-wrap').forEach(f => f.classList.remove('active'));
      document.getElementById('form-login').classList.add('active');
      document.getElementById('tab-login')?.classList.add('active');
    });

    /* Toggle mot de passe */
    document.querySelectorAll('.toggle-pw').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type  = input.type === 'password' ? 'text' : 'password';
        btn.textContent = input.type === 'password' ? '👁' : '🙈';
      });
    });

    /* Force mot de passe */
    document.getElementById('signup-password')?.addEventListener('input', function () {
      const val = this.value;
      const el  = document.getElementById('pw-strength');
      if (!el) return;
      let s = 0;
      if (val.length >= 8) s++; if (/[A-Z]/.test(val)) s++;
      if (/[0-9]/.test(val)) s++; if (/[^A-Za-z0-9]/.test(val)) s++;
      const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];
      const colors = ['', '#e05c5c', '#f0a030', '#6cc', '#4caf50'];
      el.innerHTML = val ? `<div class="pw-bar"><div class="pw-fill" style="width:${s*25}%;background:${colors[s]}"></div></div><span style="color:${colors[s]}">${labels[s]}</span>` : '';
    });

    /* Connexion */
    document.getElementById('btn-login')?.addEventListener('click', async () => {
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn      = document.getElementById('btn-login');
      if (!email || !password) { showMessage('Veuillez remplir tous les champs.'); return; }
      setLoading(btn, true); hideMessage();
      try { await signIn(email, password); window.location.href = 'profile.html'; }
      catch (err) { showMessage(translateError(err.message)); }
      finally { setLoading(btn, false); }
    });

    /* Inscription */
    document.getElementById('btn-signup')?.addEventListener('click', async () => {
      const username = document.getElementById('signup-username').value.trim();
      const email    = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const btn      = document.getElementById('btn-signup');
      if (!username || !email || !password) { showMessage('Veuillez remplir tous les champs.'); return; }
      if (password.length < 8) { showMessage('Le mot de passe doit contenir au moins 8 caractères.'); return; }
      setLoading(btn, true); hideMessage();
      try { await signUp(email, password, username); showMessage('Compte créé ! Vérifiez votre email.', 'success'); }
      catch (err) { showMessage(translateError(err.message)); }
      finally { setLoading(btn, false); }
    });

    /* Google */
    document.getElementById('btn-google-login')?.addEventListener('click', signInWithGoogle);
    document.getElementById('btn-google-signup')?.addEventListener('click', signInWithGoogle);

    /* Reset mot de passe */
    document.getElementById('btn-reset')?.addEventListener('click', async () => {
      const email = document.getElementById('reset-email').value.trim();
      const btn   = document.getElementById('btn-reset');
      if (!email) { showMessage('Entrez votre email.'); return; }
      setLoading(btn, true); hideMessage();
      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth.html'
        });
        if (error) throw error;
        showMessage('Email envoyé ! Vérifiez votre boîte.', 'success');
      } catch (err) { showMessage(translateError(err.message)); }
      finally { setLoading(btn, false); }
    });

    /* Entrée clavier */
    document.getElementById('login-password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-login').click();
    });
    document.getElementById('signup-password')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-signup').click();
    });
  }

  /* ════════════════════════════════════════
     9. PAGE INDEX — Favoris depuis Supabase
  ════════════════════════════════════════ */
  function initIndexFavorites(user) {
    /* Exposer sur window._sbUser pour app.js */
    window._sbUser = user || null;

    /* Charger les favoris depuis Supabase si connecté */
    if (!user) return;
    sb.from('favorites').select('tool_id').eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        /* Mettre à jour le Set de favoris dans app.js */
        if (window._appState) {
          window._appState.favorites = new Set(data.map(f => String(f.tool_id)));
          if (typeof window._renderTools === 'function') window._renderTools();
        }
      });
  }

  /* ════════════════════════════════════════
     10. INIT PRINCIPAL
  ════════════════════════════════════════ */
  const session = await getSession();
  const user    = session?.user || null;
  let profile   = null;
  if (user) profile = await ensureProfile(user);

  /* Nav avatar sur toutes les pages */
  await initNav(user, profile);

  if (IS_PROFILE) {
    document.getElementById('profile-loading')?.style &&
      (document.getElementById('profile-loading').style.display = 'none');

    if (!user) {
      const unauth = document.getElementById('profile-unauth');
      if (unauth) unauth.style.display = 'flex';
    } else {
      const main = document.getElementById('profile-main');
      if (main) main.style.display = 'flex';
      await initProfile(user, profile);
    }
  }

  if (IS_AUTH)  initAuth(user);
  if (IS_INDEX) initIndexFavorites(user);

  /* Émettre un événement pour app.js */
  window.dispatchEvent(new CustomEvent('albexia:ready', { detail: { user, sb } }));

})();

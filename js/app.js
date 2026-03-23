/* ═══════════════════════════════════════
   AnnuaireIA — app.js
   Fonctionnalités : navigation, JSON,
   favoris (localStorage), soumission d'outil
   ═══════════════════════════════════════ */

'use strict';

const LS_KEY = 'annuaireIA_favorites';

// ─── STATE ───────────────────────────────
const state = {
  tools:   [],
  blog:    [],
  gallery: [],
  activeToolCat:    'Tous',
  activeBlogCat:    'Tous',
  activeGalleryCat: 'Tous',
  searchQuery: '',
  favorites: loadFavorites(),
};

// ─── COLOR PALETTES ──────────────────────
const catColors = {
  Texte:        { bg: 'rgba(108,99,255,0.18)'  },
  Image:        { bg: 'rgba(255,107,157,0.18)' },
  Musique:      { bg: 'rgba(0,212,170,0.18)'   },
  Code:         { bg: 'rgba(108,99,255,0.18)'  },
  Vidéo:        { bg: 'rgba(255,107,157,0.18)' },
  Recherche:    { bg: 'rgba(0,212,170,0.18)'   },
  Audio:        { bg: 'rgba(108,99,255,0.18)'  },
  Productivité: { bg: 'rgba(245,166,35,0.18)'  },
  Autre:        { bg: 'rgba(255,255,255,0.08)' },
};

const blogColors = {
  Guide:      { bg: 'rgba(108,99,255,0.2)',  tagBg: 'rgba(108,99,255,0.15)',  tagColor: '#a8a3ff' },
  Sélection:  { bg: 'rgba(255,107,157,0.2)', tagBg: 'rgba(255,107,157,0.15)', tagColor: '#ff6b9d' },
  Débutant:   { bg: 'rgba(0,212,170,0.2)',   tagBg: 'rgba(0,212,170,0.15)',   tagColor: '#00d4aa' },
  Comparatif: { bg: 'rgba(245,166,35,0.2)',  tagBg: 'rgba(245,166,35,0.15)',  tagColor: '#f5a623' },
  Tutoriel:   { bg: 'rgba(108,99,255,0.2)',  tagBg: 'rgba(108,99,255,0.15)',  tagColor: '#a8a3ff' },
  Analyse:    { bg: 'rgba(0,212,170,0.2)',   tagBg: 'rgba(0,212,170,0.15)',   tagColor: '#00d4aa' },
};

const galleryColors = {
  image:   'rgba(108,99,255,0.2)',
  vidéo:   'rgba(255,107,157,0.18)',
  musique: 'rgba(0,212,170,0.2)',
};

// ═══════════════════════════════════════
// FAVORIS
// ═══════════════════════════════════════

function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...state.favorites]));
  } catch (e) {
    console.warn('localStorage indisponible:', e);
  }
}

function toggleFavorite(toolId, event) {
  event.stopPropagation();
  const id = String(toolId);
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    showToast('Retiré des favoris');
  } else {
    state.favorites.add(id);
    showToast('♥ Ajouté aux favoris !');
  }
  saveFavorites();
  updateFavCount();
  renderTools();
  renderFavorites();
}

function updateFavCount() {
  const count = state.favorites.size;
  const badge = document.getElementById('nav-fav-count');
  if (badge) badge.textContent = count > 0 ? count : '';
}

function renderFavorites() {
  const favTools = state.tools.filter(t => state.favorites.has(String(t.id)));
  const grid = document.getElementById('fav-grid');
  if (!grid) return;

  if (favTools.length === 0) {
    grid.innerHTML = `
      <div class="fav-empty" style="grid-column:1/-1">
        <div class="fav-empty-icon">♡</div>
        <h3>Aucun favori pour l'instant</h3>
        <p>Cliquez sur le cœur ♥ d'un outil pour le sauvegarder ici.</p>
        <button class="btn-main" onclick="showPage('tools')">Explorer les outils</button>
      </div>`;
    return;
  }

  const priceLabel = { free: 'Gratuit', freemium: 'Freemium', paid: 'Payant' };
  grid.innerHTML = favTools.map(t => {
    const col = catColors[t.category] || { bg: 'rgba(255,255,255,0.08)' };
    const iconHtml = t.favicon
      ? `<img src="${t.favicon}" alt="${t.name}" class="tool-favicon"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
            onload="this.nextElementSibling.style.display='none'">
         <span class="tool-ico-fallback" style="display:none">${t.emoji}</span>`
      : `<span class="tool-ico-fallback">${t.emoji}</span>`;
    return `
      <article class="tool-card" onclick="window.open('${t.url}','_blank')">
        <div class="tool-head">
          <div class="tool-ico" style="background:${col.bg}">${iconHtml}</div>
          <div style="flex:1">
            <div class="tool-name">${t.name}</div>
            <div class="tool-cat">${t.category}</div>
          </div>
          <button class="fav-btn active"
            onclick="toggleFavorite(${t.id}, event)"
            title="Retirer des favoris">♥</button>
        </div>
        <p class="tool-desc">${t.description}</p>
        <div class="tool-foot">
          <span class="price-tag price-${t.price}">${priceLabel[t.price]}</span>
          <span class="stars">${renderStars(t.rating)}</span>
        </div>
      </article>`;
  }).join('');
}

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════

let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ═══════════════════════════════════════
// MODAL — SOUMISSION D'OUTIL
// ═══════════════════════════════════════

function openModal() {
  resetForm();
  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('f-name').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function resetForm() {
  ['f-name','f-url','f-cat','f-price','f-desc','f-emoji','f-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const err = document.getElementById('form-error');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  const countEl = document.getElementById('f-desc-count');
  if (countEl) countEl.textContent = '0 / 200';
}

function validateForm() {
  const name  = document.getElementById('f-name').value.trim();
  const url   = document.getElementById('f-url').value.trim();
  const cat   = document.getElementById('f-cat').value;
  const price = document.getElementById('f-price').value;
  const desc  = document.getElementById('f-desc').value.trim();
  if (!name)  return "Le nom de l'outil est requis.";
  if (!url)   return "L'URL officielle est requise.";
  if (!url.startsWith('http')) return "L'URL doit commencer par http:// ou https://";
  if (!cat)   return 'Veuillez choisir une catégorie.';
  if (!price) return 'Veuillez indiquer la tarification.';
  if (!desc)  return 'La description est requise.';
  if (desc.length < 20) return 'La description doit faire au moins 20 caractères.';
  return null;
}

function handleSubmit() {
  const errMsg = validateForm();
  const errEl  = document.getElementById('form-error');

  if (errMsg) {
    errEl.textContent = errMsg;
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const submission = {
    name:        document.getElementById('f-name').value.trim(),
    url:         document.getElementById('f-url').value.trim(),
    category:    document.getElementById('f-cat').value,
    price:       document.getElementById('f-price').value,
    description: document.getElementById('f-desc').value.trim(),
    emoji:       document.getElementById('f-emoji').value.trim() || '🤖',
    email:       document.getElementById('f-email').value.trim(),
    submittedAt: new Date().toISOString(),
  };

  console.log('Soumission reçue :', submission);
  // TODO: fetch('/api/submit', { method:'POST', body: JSON.stringify(submission) })

  // Afficher confirmation
  document.querySelector('.modal-body').innerHTML = `
    <div class="form-success">
      <div class="success-icon">✅</div>
      <h4>Soumission envoyée !</h4>
      <p>Merci pour votre contribution. L'outil <strong>${submission.name}</strong>
      sera examiné par notre équipe et ajouté sous 48h si approuvé.</p>
    </div>`;
  document.querySelector('.modal-footer').innerHTML = `
    <button class="btn-main" onclick="closeModal()">Fermer</button>`;
}

// ═══════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Erreur chargement ${path}`);
  return res.json();
}

async function loadAllData() {
  try {
    const [tools, blog, gallery] = await Promise.all([
      loadJSON('data/tools.json'),
      loadJSON('data/blog.json'),
      loadJSON('data/gallery.json'),
    ]);
    state.tools   = tools;
    state.blog    = blog;
    state.gallery = gallery;
    renderTools();
    renderBlog();
    renderGallery();
    renderFavorites();
    updateFavCount();
  } catch (err) {
    console.error('Erreur chargement données:', err);
    showError('tools-grid',   'Impossible de charger les outils.');
    showError('blog-list',    'Impossible de charger les articles.');
    showError('gallery-grid', 'Impossible de charger la galerie.');
  }
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  const btn = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (pageId === 'favorites') renderFavorites();
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function getColor(map, key, fallback = {}) {
  return map[key] || fallback;
}

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="${i <= rating ? 'on' : ''}">★</span>`;
  }
  return html;
}

function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>${msg}</div>`;
}

function showEmpty(containerId, msg = 'Aucun résultat trouvé.') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div>${msg}</div>`;
}

// ═══════════════════════════════════════
// TOOLS
// ═══════════════════════════════════════

function renderTools() {
  const q = state.searchQuery.toLowerCase();
  const cats = ['Tous', ...new Set(state.tools.map(t => t.category))];

  document.getElementById('tool-filters').innerHTML = cats.map(c =>
    `<button class="filter${c === state.activeToolCat ? ' active' : ''}"
      onclick="setToolCat('${c}')">${c}</button>`
  ).join('');

  const filtered = state.tools.filter(t =>
    (state.activeToolCat === 'Tous' || t.category === state.activeToolCat) &&
    (t.name.toLowerCase().includes(q) ||
     t.description.toLowerCase().includes(q) ||
     t.tags.some(tag => tag.toLowerCase().includes(q)))
  );

  if (!filtered.length) { showEmpty('tools-grid'); return; }

  const priceLabel = { free: 'Gratuit', freemium: 'Freemium', paid: 'Payant' };

  document.getElementById('tools-grid').innerHTML = filtered.map(t => {
    const col = catColors[t.category] || { bg: 'rgba(255,255,255,0.08)' };
    const isFav = state.favorites.has(String(t.id));
    const iconHtml = t.favicon
      ? `<img src="${t.favicon}" alt="${t.name}" class="tool-favicon"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
            onload="this.nextElementSibling.style.display='none'">
         <span class="tool-ico-fallback" style="display:none">${t.emoji}</span>`
      : `<span class="tool-ico-fallback">${t.emoji}</span>`;
    return `
      <article class="tool-card" onclick="window.open('${t.url}','_blank')">
        <div class="tool-head">
          <div class="tool-ico" style="background:${col.bg}">${iconHtml}</div>
          <div style="flex:1">
            <div class="tool-name">${t.name}</div>
            <div class="tool-cat">${t.category}</div>
          </div>
          <button class="fav-btn ${isFav ? 'active' : ''}"
            onclick="toggleFavorite(${t.id}, event)"
            title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">♥</button>
        </div>
        <p class="tool-desc">${t.description}</p>
        <div class="tool-foot">
          <span class="price-tag price-${t.price}">${priceLabel[t.price]}</span>
          <span class="stars">${renderStars(t.rating)}</span>
        </div>
      </article>`;
  }).join('');
}

function setToolCat(cat) {
  state.activeToolCat = cat;
  renderTools();
}

// ═══════════════════════════════════════
// BLOG
// ═══════════════════════════════════════

function renderBlog() {
  const cats = ['Tous', ...new Set(state.blog.map(p => p.category))];
  document.getElementById('blog-filters').innerHTML = cats.map(c =>
    `<button class="filter${c === state.activeBlogCat ? ' active' : ''}"
      onclick="setBlogCat('${c}')">${c}</button>`
  ).join('');

  const filtered = state.blog.filter(p =>
    state.activeBlogCat === 'Tous' || p.category === state.activeBlogCat
  );

  if (!filtered.length) { showEmpty('blog-list'); return; }

  document.getElementById('blog-list').innerHTML = filtered.map(p => {
    const col = getColor(blogColors, p.category, { bg: 'rgba(255,255,255,0.08)', tagBg: 'rgba(255,255,255,0.08)', tagColor: '#aaa' });
    return `
      <article class="blog-card">
        <div class="blog-thumb" style="background:${col.bg}">${p.emoji}</div>
        <div class="blog-body">
          <div class="blog-title">${p.title}</div>
          <div class="blog-meta">${p.date} · ${p.author}</div>
          <p class="blog-excerpt">${p.excerpt}</p>
          <span class="blog-tag" style="background:${col.tagBg};color:${col.tagColor}">${p.category}</span>
        </div>
        <div class="blog-mins">${p.readTime} de lecture</div>
      </article>`;
  }).join('');
}

function setBlogCat(cat) {
  state.activeBlogCat = cat;
  renderBlog();
}

// ═══════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════

function renderGallery() {
  const types = ['Tous', 'image', 'vidéo', 'musique'];
  const typeLabels = { Tous: 'Tous', image: 'Image', vidéo: 'Vidéo', musique: 'Musique' };

  document.getElementById('gallery-filters').innerHTML = types.map(t =>
    `<button class="filter${t === state.activeGalleryCat ? ' active' : ''}"
      onclick="setGalleryCat('${t}')">${typeLabels[t]}</button>`
  ).join('');

  const filtered = state.gallery.filter(g =>
    state.activeGalleryCat === 'Tous' || g.type === state.activeGalleryCat
  );

  if (!filtered.length) { showEmpty('gallery-grid'); return; }

  document.getElementById('gallery-grid').innerHTML = filtered.map(g => {
    const bg = galleryColors[g.type] || 'rgba(255,255,255,0.08)';
    return `
      <article class="gallery-card">
        <div class="gallery-thumb" style="background:${bg}">
          ${g.emoji}
          <span class="gallery-type type-${g.type}">${typeLabels[g.type]}</span>
        </div>
        <div class="gallery-info">
          <div class="gallery-title">${g.title}</div>
          <div class="gallery-tool">${g.tool}</div>
          <div class="gallery-likes"><span>♥</span> ${g.likes} likes</div>
        </div>
      </article>`;
  }).join('');
}

function setGalleryCat(cat) {
  state.activeGalleryCat = cat;
  renderGallery();
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════

function handleSearch(e) {
  state.searchQuery = e.target.value;
  renderTools();
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // Navigation
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Recherche
  const searchEl = document.getElementById('tool-search');
  if (searchEl) searchEl.addEventListener('input', handleSearch);

  // Compteur de caractères
  const descEl = document.getElementById('f-desc');
  if (descEl) {
    descEl.addEventListener('input', () => {
      document.getElementById('f-desc-count').textContent = `${descEl.value.length} / 200`;
    });
  }

  // Modal — ouvrir
  document.getElementById('open-submit-btn')?.addEventListener('click', openModal);

  // Modal — fermer
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Modal — soumettre
  document.getElementById('modal-submit')?.addEventListener('click', handleSubmit);

  // Fermer avec Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Charger les données JSON
  loadAllData();
});

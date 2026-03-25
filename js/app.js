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
  toolsPage:   1,
  blogPage:    1,
  galleryPage: 1,
  itemsPerPage: 20,
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
window.blogColorsMap = blogColors;

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

  if (!filtered.length) { showEmpty('tools-grid'); setPaginationEl('tools-grid', ''); return; }

  // Pagination
  const total      = filtered.length;
  const totalPages = Math.ceil(total / state.itemsPerPage);
  if (state.toolsPage > totalPages) state.toolsPage = 1;
  const start    = (state.toolsPage - 1) * state.itemsPerPage;
  const paged    = filtered.slice(start, start + state.itemsPerPage);
  const shownEnd = start + paged.length;

  const priceLabel = { free: 'Gratuit', freemium: 'Freemium', paid: 'Payant' };

  document.getElementById('tools-grid').innerHTML = paged.map(t => {
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

  setPaginationEl('tools-grid', buildPaginationHTML(state.toolsPage, totalPages, total, start + 1, shownEnd, 'tools', 'outils'));
}

function buildPaginationHTML(current, totalPages, totalItems, shownStart, shownEnd, section, label) {
  if (totalPages <= 1) return '';
  let pages = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      pages += `<button class="pg-btn${i === current ? ' active' : ''}" onclick="goToPage('${section}',${i})">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      pages += `<span class="pg-dots">…</span>`;
    }
  }
  return `
    <div class="pagination">
      <span class="pg-info">${shownStart}–${shownEnd} sur ${totalItems} ${label}</span>
      <div class="pg-controls">
        <button class="pg-btn pg-arrow" onclick="goToPage('${section}',${current - 1})" ${current === 1 ? 'disabled' : ''}>‹</button>
        ${pages}
        <button class="pg-btn pg-arrow" onclick="goToPage('${section}',${current + 1})" ${current === totalPages ? 'disabled' : ''}>›</button>
      </div>
    </div>`;
}

function setPaginationEl(containerId, html) {
  let el = document.getElementById(containerId + '-pagination');
  if (!el) {
    el = document.createElement('div');
    el.id = containerId + '-pagination';
    document.getElementById(containerId).insertAdjacentElement('afterend', el);
  }
  el.innerHTML = html;
}

function goToPage(section, page) {
  if (section === 'tools')   { state.toolsPage   = page; renderTools();   document.getElementById('tools').scrollIntoView({behavior:'smooth',block:'start'}); }
  if (section === 'blog')    { state.blogPage     = page; renderBlog();    document.getElementById('blog').scrollIntoView({behavior:'smooth',block:'start'}); }
  if (section === 'gallery') { state.galleryPage  = page; renderGallery(); document.getElementById('gallery').scrollIntoView({behavior:'smooth',block:'start'}); }
}

function setToolCat(cat) {
  state.activeToolCat = cat;
  state.toolsPage = 1;
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

  if (!filtered.length) { showEmpty('blog-list'); setPaginationEl('blog-list', ''); return; }

  const total      = filtered.length;
  const totalPages = Math.ceil(total / state.itemsPerPage);
  if (state.blogPage > totalPages) state.blogPage = 1;
  const start    = (state.blogPage - 1) * state.itemsPerPage;
  const paged    = filtered.slice(start, start + state.itemsPerPage);
  const shownEnd = start + paged.length;

  document.getElementById('blog-list').innerHTML = paged.map(p => {
    const col = getColor(blogColors, p.category, { bg: 'rgba(255,255,255,0.08)', tagBg: 'rgba(255,255,255,0.08)', tagColor: '#aaa' });
    const href = p.url ? p.url : '#';
    return `
      <a href="${href}" class="blog-card-link" style="text-decoration:none;display:block;">
        <article class="blog-card">
          <div class="blog-thumb" style="background:${col.bg}">${p.emoji}</div>
          <div class="blog-body">
            <div class="blog-title">${p.title}</div>
            <div class="blog-meta">${p.date} · ${p.author}</div>
            <p class="blog-excerpt">${p.excerpt}</p>
            <span class="blog-tag" style="background:${col.tagBg};color:${col.tagColor}">${p.category}</span>
          </div>
          <div class="blog-mins">${p.readTime} de lecture</div>
        </article>
      </a>`;
  }).join('');

  setPaginationEl('blog-list', buildPaginationHTML(state.blogPage, totalPages, total, start + 1, shownEnd, 'blog', 'articles'));
}

function setBlogCat(cat) {
  state.activeBlogCat = cat;
  state.blogPage = 1;
  renderBlog();
}

// ═══════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════

function renderGallery() {
  const types = ['Tous', 'image', 'vidéo', 'musique'];
  const typeLabels = { Tous: 'Tous', image: 'Image', vidéo: 'Vidéo', musique: 'Musique' };
  const typeIcons  = { image: '🖼', vidéo: '▶', musique: '♪' };

  document.getElementById('gallery-filters').innerHTML = types.map(t =>
    `<button class="filter${t === state.activeGalleryCat ? ' active' : ''}"
      onclick="setGalleryCat('${t}')">${typeLabels[t]}</button>`
  ).join('');

  const filtered = state.gallery.filter(g =>
    state.activeGalleryCat === 'Tous' || g.type === state.activeGalleryCat
  );

  if (!filtered.length) { showEmpty('gallery-grid'); setPaginationEl('gallery-grid', ''); return; }

  const total      = filtered.length;
  const totalPages = Math.ceil(total / state.itemsPerPage);
  if (state.galleryPage > totalPages) state.galleryPage = 1;
  const start    = (state.galleryPage - 1) * state.itemsPerPage;
  const paged    = filtered.slice(start, start + state.itemsPerPage);
  const shownEnd = start + paged.length;

  // Index réel dans filtered pour le lightbox (pas dans paged)
  document.getElementById('gallery-grid').innerHTML = paged.map((g, i) => {
    const realIndex = start + i;
    const isMusic = g.type === 'musique';
    const thumbStyle = isMusic ? `background:linear-gradient(135deg,#6c63ff,#ff6b9d);` : `background:#111;`;
    const thumbContent = isMusic
      ? `<span style="font-size:48px">🎵</span>`
      : `<img src="${g.thumb}" alt="${g.title}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">`;
    return `
      <article class="gallery-card" onclick="openGalleryItem(${realIndex})" style="cursor:pointer;">
        <div class="gallery-thumb" style="${thumbStyle}position:relative;overflow:hidden;">
          ${thumbContent}
          <span class="gallery-type type-${g.type}">${typeLabels[g.type]}</span>
          <div class="gallery-play-icon">${typeIcons[g.type]}</div>
        </div>
        <div class="gallery-info">
          <div class="gallery-title">${g.title}</div>
          <div class="gallery-tool">${g.tool}</div>
          <div class="gallery-likes"><span>♥</span> ${g.likes} likes</div>
        </div>
      </article>`;
  }).join('');

  state.filteredGallery = filtered;
  setPaginationEl('gallery-grid', buildPaginationHTML(state.galleryPage, totalPages, total, start + 1, shownEnd, 'gallery', 'œuvres'));
}

function openGalleryItem(index) {
  if (window.GalleryLightbox) {
    window.GalleryLightbox.openLightbox(state.filteredGallery, index);
  }
}

function setGalleryCat(cat) {
  state.activeGalleryCat = cat;
  state.galleryPage = 1;
  renderGallery();
}

// ═══════════════════════════════════════
// NEWSLETTER (Formspree)
// ═══════════════════════════════════════

function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('footer-email').value.trim();
    const feedback = document.getElementById('nl-feedback');
    const btn      = form.querySelector('button[type=submit]');
    if (!email) return;
    btn.textContent = '...';
    btn.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        feedback.textContent = '✓ Inscription confirmée ! Merci ' + email.split('@')[0] + ' !';
        feedback.style.color = '#00d4aa';
        form.reset();
      } else {
        feedback.textContent = '⚠ Erreur. Réessayez dans un instant.';
        feedback.style.color = '#f5a623';
      }
    } catch {
      feedback.textContent = '⚠ Erreur réseau. Réessayez.';
      feedback.style.color = '#f5a623';
    }
    btn.textContent = 'S\'abonner';
    btn.disabled = false;
  });
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════

function handleSearch(e) {
  state.searchQuery = e.target.value;
  state.toolsPage = 1;
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

  // Newsletter Formspree
  initNewsletter();

  // Charger les données JSON
  loadAllData();

  // Initialiser le lecteur blog
  if (window.BlogReader) {
    window.BlogReader.createBlogReader();
  }

  // Initialiser le lightbox galerie
  if (window.GalleryLightbox) {
    window.GalleryLightbox.injectLightboxCSS();
    window.GalleryLightbox.createLightbox();
  }
});

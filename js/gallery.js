/* ═══════════════════════════════════════
   AnnuaireIA — gallery.js
   Lightbox · Zoom · Swipe · Plein écran
   ═══════════════════════════════════════ */

'use strict';

// ─── ÉTAT LIGHTBOX ───────────────────────
const lb = {
  items:    [],   // items filtrés courants
  index:    0,    // index actif
  zoom:     1,    // niveau de zoom
  dragging: false,
  startX:   0,
  startY:   0,
  panX:     0,
  panY:     0,
  lastPanX: 0,
  lastPanY: 0,
  swipeStartX: 0,
  swipeStartY: 0,
};

// ─── CRÉATION DU LIGHTBOX DOM ─────────────
function createLightbox() {
  if (document.getElementById('lb-overlay')) return;

  const html = `
  <div id="lb-overlay" role="dialog" aria-modal="true" aria-label="Visionneuse">

    <!-- Bouton fermer -->
    <button id="lb-close" aria-label="Fermer">✕</button>

    <!-- Navigation -->
    <button id="lb-prev" aria-label="Précédent">&#8249;</button>
    <button id="lb-next" aria-label="Suivant">&#8250;</button>

    <!-- Compteur -->
    <div id="lb-counter"></div>

    <!-- Zone média -->
    <div id="lb-media-wrap">
      <img id="lb-img" alt="" draggable="false">
      <video id="lb-video" controls playsinline></video>
      <div id="lb-audio-wrap">
        <div id="lb-audio-art"></div>
        <div id="lb-audio-title"></div>
        <audio id="lb-audio" controls></audio>
      </div>
    </div>

    <!-- Info bas -->
    <div id="lb-info">
      <span id="lb-title"></span>
      <span id="lb-tool"></span>
    </div>

    <!-- Contrôles zoom -->
    <div id="lb-zoom-controls">
      <button id="lb-zoom-out" aria-label="Dézoomer">−</button>
      <span id="lb-zoom-level">100%</span>
      <button id="lb-zoom-in" aria-label="Zoomer">+</button>
      <button id="lb-zoom-reset" aria-label="Réinitialiser zoom">↺</button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  bindLightboxEvents();
}

// ─── STYLE LIGHTBOX (injecté une seule fois) ─
function injectLightboxCSS() {
  if (document.getElementById('lb-style')) return;
  const style = document.createElement('style');
  style.id = 'lb-style';
  style.textContent = `
    #lb-overlay {
      display: none;
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.95);
      flex-direction: column;
      align-items: center; justify-content: center;
      user-select: none;
    }
    #lb-overlay.open { display: flex; }

    #lb-close {
      position: absolute; top: 16px; right: 20px;
      background: rgba(255,255,255,0.1);
      border: none; color: #fff;
      width: 40px; height: 40px; border-radius: 50%;
      font-size: 18px; cursor: pointer; z-index: 10;
      transition: background .2s;
    }
    #lb-close:hover { background: rgba(255,255,255,0.25); }

    #lb-prev, #lb-next {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(255,255,255,0.1);
      border: none; color: #fff;
      width: 48px; height: 48px; border-radius: 50%;
      font-size: 28px; cursor: pointer; z-index: 10;
      transition: background .2s; line-height: 1;
    }
    #lb-prev { left: 16px; }
    #lb-next { right: 16px; }
    #lb-prev:hover, #lb-next:hover { background: rgba(255,255,255,0.25); }

    #lb-counter {
      position: absolute; top: 20px; left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.6); font-size: 13px;
    }

    #lb-media-wrap {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; cursor: grab;
      padding: 60px 72px 80px;
    }
    #lb-media-wrap.dragging { cursor: grabbing; }

    #lb-img {
      max-width: 100%; max-height: 100%;
      object-fit: contain;
      transform-origin: center center;
      transition: transform 0.1s ease;
      display: none; pointer-events: none;
      border-radius: 4px;
    }
    #lb-img.active { display: block; }

    #lb-video {
      max-width: 100%; max-height: 100%;
      display: none; border-radius: 4px;
      outline: none;
    }
    #lb-video.active { display: block; }

    #lb-audio-wrap {
      display: none; flex-direction: column;
      align-items: center; gap: 20px; text-align: center;
    }
    #lb-audio-wrap.active { display: flex; }
    #lb-audio-art {
      width: 220px; height: 220px; border-radius: 16px;
      background: linear-gradient(135deg, #6c63ff, #ff6b9d);
      display: flex; align-items: center; justify-content: center;
      font-size: 72px;
    }
    #lb-audio-title { color: #fff; font-size: 18px; font-weight: 500; }
    #lb-audio { width: 320px; outline: none; }

    #lb-info {
      position: absolute; bottom: 48px; left: 50%;
      transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    #lb-title { color: #fff; font-size: 15px; font-weight: 500; }
    #lb-tool  { color: rgba(255,255,255,0.5); font-size: 12px; }

    #lb-zoom-controls {
      position: absolute; bottom: 16px; right: 16px;
      display: flex; align-items: center; gap: 6px;
      background: rgba(0,0,0,0.5); border-radius: 20px;
      padding: 6px 12px;
    }
    #lb-zoom-controls button {
      background: rgba(255,255,255,0.15);
      border: none; color: #fff;
      width: 28px; height: 28px; border-radius: 50%;
      font-size: 16px; cursor: pointer; line-height: 1;
      transition: background .15s;
    }
    #lb-zoom-controls button:hover { background: rgba(255,255,255,0.3); }
    #lb-zoom-level { color: rgba(255,255,255,0.7); font-size: 12px; min-width: 38px; text-align: center; }

    /* Animation entrée */
    @keyframes lbFadeIn { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
    #lb-img.active, #lb-video.active, #lb-audio-wrap.active {
      animation: lbFadeIn .2s ease;
    }
  `;
  document.head.appendChild(style);
}

// ─── OUVRIR LIGHTBOX ─────────────────────
function openLightbox(items, index) {
  lb.items = items;
  lb.index = index;
  resetZoom();
  document.getElementById('lb-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  loadItem();
}

function closeLightbox() {
  document.getElementById('lb-overlay').classList.remove('open');
  document.body.style.overflow = '';
  // Stopper audio/vidéo
  document.getElementById('lb-video').pause();
  document.getElementById('lb-audio').pause();
}

// ─── CHARGER UN MÉDIA ────────────────────
function loadItem() {
  const item = lb.items[lb.index];
  if (!item) return;

  const img      = document.getElementById('lb-img');
  const video    = document.getElementById('lb-video');
  const audioWrap= document.getElementById('lb-audio-wrap');
  const audio    = document.getElementById('lb-audio');

  // Reset
  img.classList.remove('active');
  video.classList.remove('active');
  audioWrap.classList.remove('active');
  video.pause(); video.src = '';
  audio.pause(); audio.src = '';
  resetZoom();

  // Infos
  document.getElementById('lb-title').textContent = item.title;
  document.getElementById('lb-tool').textContent  = item.tool;
  document.getElementById('lb-counter').textContent =
    `${lb.index + 1} / ${lb.items.length}`;

  // Navigation
  document.getElementById('lb-prev').style.display = lb.items.length > 1 ? '' : 'none';
  document.getElementById('lb-next').style.display = lb.items.length > 1 ? '' : 'none';

  // Zoom visible seulement pour images
  document.getElementById('lb-zoom-controls').style.display =
    item.type === 'image' ? '' : 'none';

  if (item.type === 'image') {
    img.src = item.src;
    img.classList.add('active');
  } else if (item.type === 'vidéo') {
    video.src = item.src;
    video.classList.add('active');
    video.load();
  } else if (item.type === 'musique') {
    document.getElementById('lb-audio-art').textContent = '🎵';
    document.getElementById('lb-audio-title').textContent = item.title;
    audio.src = item.src;
    audioWrap.classList.add('active');
  }
}

// ─── NAVIGATION ──────────────────────────
function lbPrev() {
  lb.index = (lb.index - 1 + lb.items.length) % lb.items.length;
  loadItem();
}

function lbNext() {
  lb.index = (lb.index + 1) % lb.items.length;
  loadItem();
}

// ─── ZOOM ────────────────────────────────
function resetZoom() {
  lb.zoom = 1; lb.panX = 0; lb.panY = 0;
  lb.lastPanX = 0; lb.lastPanY = 0;
  applyTransform();
}

function setZoom(z) {
  lb.zoom = Math.min(5, Math.max(1, z));
  if (lb.zoom === 1) { lb.panX = 0; lb.panY = 0; }
  applyTransform();
  document.getElementById('lb-zoom-level').textContent = Math.round(lb.zoom * 100) + '%';
}

function applyTransform() {
  const img = document.getElementById('lb-img');
  img.style.transform = `scale(${lb.zoom}) translate(${lb.panX / lb.zoom}px, ${lb.panY / lb.zoom}px)`;
  document.getElementById('lb-zoom-level').textContent = Math.round(lb.zoom * 100) + '%';
}

// ─── ÉVÉNEMENTS ──────────────────────────
function bindLightboxEvents() {
  const overlay  = document.getElementById('lb-overlay');
  const wrap     = document.getElementById('lb-media-wrap');
  const img      = document.getElementById('lb-img');

  // Fermer
  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeLightbox();
  });

  // Flèches nav
  document.getElementById('lb-prev').addEventListener('click', lbPrev);
  document.getElementById('lb-next').addEventListener('click', lbNext);

  // Zoom boutons
  document.getElementById('lb-zoom-in').addEventListener('click',    () => setZoom(lb.zoom + 0.5));
  document.getElementById('lb-zoom-out').addEventListener('click',   () => setZoom(lb.zoom - 0.5));
  document.getElementById('lb-zoom-reset').addEventListener('click', () => resetZoom());

  // Double clic pour zoom rapide
  img.addEventListener('dblclick', () => {
    lb.zoom === 1 ? setZoom(2.5) : resetZoom();
  });

  // Molette souris pour zoom
  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setZoom(lb.zoom + delta);
  }, { passive: false });

  // Drag pour pan (quand zoomé)
  wrap.addEventListener('mousedown', e => {
    if (lb.zoom <= 1) return;
    lb.dragging = true;
    lb.startX = e.clientX - lb.lastPanX;
    lb.startY = e.clientY - lb.lastPanY;
    wrap.classList.add('dragging');
  });
  window.addEventListener('mousemove', e => {
    if (!lb.dragging) return;
    lb.panX = e.clientX - lb.startX;
    lb.panY = e.clientY - lb.startY;
    applyTransform();
  });
  window.addEventListener('mouseup', () => {
    if (!lb.dragging) return;
    lb.dragging = false;
    lb.lastPanX = lb.panX;
    lb.lastPanY = lb.panY;
    wrap.classList.remove('dragging');
  });

  // ── SWIPE TACTILE ──────────────────────
  let touchStartX = 0, touchStartY = 0, touchMoved = false;

  overlay.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved  = false;
  }, { passive: true });

  overlay.addEventListener('touchmove', e => {
    touchMoved = true;
    // Pan si zoomé
    if (lb.zoom > 1) {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      lb.panX = lb.lastPanX + dx;
      lb.panY = lb.lastPanY + dy;
      applyTransform();
    }
  }, { passive: true });

  overlay.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (lb.zoom > 1) {
      lb.lastPanX = lb.panX;
      lb.lastPanY = lb.panY;
      return;
    }

    // Swipe horizontal → navigation
    if (absDx > 50 && absDx > absDy) {
      dx < 0 ? lbNext() : lbPrev();
    }
    // Swipe bas → fermer
    else if (dy > 80 && absDy > absDx) {
      closeLightbox();
    }
  }, { passive: true });

  // Pinch to zoom (2 doigts)
  let initDist = 0, initZoom = 1;
  overlay.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      initDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initZoom = lb.zoom;
    }
  }, { passive: true });

  overlay.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setZoom(initZoom * (dist / initDist));
    }
  }, { passive: true });

  // Clavier
  document.addEventListener('keydown', e => {
    if (!document.getElementById('lb-overlay').classList.contains('open')) return;
    if (e.key === 'ArrowLeft')  lbPrev();
    if (e.key === 'ArrowRight') lbNext();
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === '+')          setZoom(lb.zoom + 0.5);
    if (e.key === '-')          setZoom(lb.zoom - 0.5);
  });
}

// ─── EXPORT ──────────────────────────────
window.GalleryLightbox = { createLightbox, injectLightboxCSS, openLightbox };

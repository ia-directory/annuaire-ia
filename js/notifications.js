/**
 * ============================================================
 *  ALBEXIA — Système de Notifications (Toast)
 *  Fichier : notifications.js
 *  Version : 1.0
 * ============================================================
 *
 *  INSTALLATION (1 ligne par page HTML) :
 *  <script src="/assets/js/notifications.js" defer></script>
 *
 *  CONFIGURATION : modifier notifications.json uniquement.
 *  Aucune modification de ce fichier n'est nécessaire au
 *  quotidien.
 * ============================================================
 */

(function () {
  "use strict";

  /* ─── Paramètres globaux ─────────────────────────────── */
  const JSON_URL  = "/data/notifications.json"; // chemin vers le fichier
  const LS_PREFIX = "albexia_notif_dismissed_";  // clé localStorage

  /* ─── Injection CSS (une seule fois) ────────────────── */
  function injectStyles() {
    if (document.getElementById("albexia-notif-styles")) return;

    const css = `
      /* ── Conteneur Toast ── */
      #albexia-toast {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9999;
        max-width: 340px;
        width: calc(100vw - 56px);

        /* Glassmorphism */
        background: rgba(26, 26, 30, 0.72);
        backdrop-filter: blur(18px) saturate(180%);
        -webkit-backdrop-filter: blur(18px) saturate(180%);
        border: 1px solid rgba(255, 107, 157, 0.25);
        border-radius: 16px;
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.45),
          0 0 0 1px rgba(255, 255, 255, 0.04) inset;

        padding: 14px 16px 14px 14px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
        text-decoration: none;
        color: inherit;

        /* Animation entrée */
        opacity: 0;
        transform: translateY(20px) scale(0.96);
        transition:
          opacity 0.35s cubic-bezier(.22,1,.36,1),
          transform 0.35s cubic-bezier(.22,1,.36,1);
        pointer-events: none;
      }

      #albexia-toast.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }

      #albexia-toast.hiding {
        opacity: 0;
        transform: translateY(12px) scale(0.94);
      }

      /* ── Zone logos ── */
      .alb-notif-logos {
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }

      .alb-notif-logos img {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 2px solid rgba(26, 26, 30, 0.9);
        object-fit: cover;
        background: #2a2a30;
        display: block;
      }

      /* Chevauche­ment logos groupés */
      .alb-notif-logos img:not(:first-child) {
        margin-left: -10px;
      }

      /* Icône promo (emoji) */
      .alb-notif-icone {
        font-size: 28px;
        line-height: 1;
        flex-shrink: 0;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,.4));
      }

      /* ── Texte ── */
      .alb-notif-body {
        flex: 1;
        min-width: 0;
      }

      .alb-notif-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: #ff6b9d;
        margin-bottom: 3px;
        font-family: system-ui, sans-serif;
      }

      .alb-notif-message {
        font-size: 13px;
        line-height: 1.45;
        color: #f0f0f5;
        font-family: system-ui, sans-serif;
        font-weight: 500;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .alb-notif-cta {
        display: inline-block;
        margin-top: 7px;
        font-size: 11px;
        font-weight: 700;
        color: #ff6b9d;
        font-family: system-ui, sans-serif;
        letter-spacing: .03em;
      }

      .alb-notif-cta::after {
        content: " →";
      }

      /* ── Bouton fermer ── */
      .alb-notif-close {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.08);
        color: rgba(240,240,245,0.55);
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background .2s, color .2s;
        padding: 0;
        margin-top: 1px;
      }

      .alb-notif-close:hover {
        background: rgba(255, 107, 157, 0.22);
        color: #ff6b9d;
      }

      /* ── Barre de progression ── */
      .alb-notif-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        border-radius: 0 0 16px 16px;
        background: linear-gradient(90deg, #ff6b9d, #ff9dc8);
        width: 100%;
        transform-origin: left center;
        transform: scaleX(1);
        transition: transform linear;
      }

      /* Responsive mobile */
      @media (max-width: 480px) {
        #albexia-toast {
          bottom: 16px;
          right: 16px;
          left: 16px;
          width: auto;
          max-width: none;
        }
      }
    `;

    const style = document.createElement("style");
    style.id = "albexia-notif-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ─── Construire le toast ────────────────────────────── */
  function buildToast(notif) {
    const toast = document.createElement("a");
    toast.id   = "albexia-toast";
    toast.href = notif.lien || (notif.tool && notif.tool.lien) || "#";
    toast.rel  = "noopener";

    /* Barre de progression */
    const bar = document.createElement("div");
    bar.className = "alb-notif-bar";
    toast.appendChild(bar);

    /* ── Zone visuelle gauche ── */
    if (notif.type === "promo" && notif.icone) {
      const ico = document.createElement("span");
      ico.className   = "alb-notif-icone";
      ico.textContent = notif.icone;
      toast.appendChild(ico);

    } else if (notif.type === "groupe" && notif.outils) {
      const logoZone = document.createElement("div");
      logoZone.className = "alb-notif-logos";
      notif.outils.slice(0, 4).forEach(function (outil) {
        const img = document.createElement("img");
        img.src   = "https://www.google.com/s2/favicons?domain=" + outil.domaine + "&sz=128";
        img.alt   = outil.nom;
        img.title = outil.nom;
        logoZone.appendChild(img);
      });
      toast.appendChild(logoZone);

    } else if (notif.type === "solo" && notif.tool) {
      const logoZone = document.createElement("div");
      logoZone.className = "alb-notif-logos";
      const img = document.createElement("img");
      img.src   = "https://www.google.com/s2/favicons?domain=" + notif.tool.domaine + "&sz=128";
      img.alt   = notif.tool.nom;
      logoZone.appendChild(img);
      toast.appendChild(logoZone);
    }

    /* ── Corps texte ── */
    const body = document.createElement("div");
    body.className = "alb-notif-body";

    const label = document.createElement("div");
    label.className = "alb-notif-label";
    label.textContent =
      notif.type === "promo"  ? "Offre exclusive" :
      notif.type === "groupe" ? "Nouveautés"      :
                                "Nouvel outil";
    body.appendChild(label);

    const msg = document.createElement("p");
    msg.className   = "alb-notif-message";
    msg.textContent = notif.message;
    body.appendChild(msg);

    if (notif.cta) {
      const cta = document.createElement("span");
      cta.className   = "alb-notif-cta";
      cta.textContent = notif.cta;
      body.appendChild(cta);
    }

    toast.appendChild(body);

    /* ── Bouton fermer ── */
    const closeBtn = document.createElement("button");
    closeBtn.className   = "alb-notif-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Fermer la notification");
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      dismissToast(toast, notif.id);
    });
    toast.appendChild(closeBtn);

    return { toast, bar };
  }

  /* ─── Afficher le toast ──────────────────────────────── */
  function showToast(notif) {
    const { toast, bar } = buildToast(notif);
    document.body.appendChild(toast);

    /* Animation entrée (next frame) */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add("visible");
      });
    });

    /* Barre de progression : disparaît après 12 s */
    const dureeAffichage = 12000; // 12 secondes
    bar.style.transition = "transform " + (dureeAffichage / 1000) + "s linear";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bar.style.transform = "scaleX(0)";
      });
    });

    /* Auto-dismiss après dureeAffichage */
    const autoTimer = setTimeout(function () {
      dismissToast(toast, notif.id, true); /* true = ne pas mémoriser */
    }, dureeAffichage);

    /* Annuler l'auto-dismiss si l'utilisateur survole */
    toast.addEventListener("mouseenter", function () {
      clearTimeout(autoTimer);
      bar.style.transition = "none";
    });
  }

  /* ─── Masquer et mémoriser ───────────────────────────── */
  function dismissToast(toast, id, autoOnly) {
    toast.classList.remove("visible");
    toast.classList.add("hiding");

    if (!autoOnly) {
      /* Mémoriser le refus utilisateur */
      try { localStorage.setItem(LS_PREFIX + id, "1"); } catch (e) {}
    }

    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 400);
  }

  /* ─── Sélectionner la notification à afficher ───────── */
  function pickNotification(liste) {
    for (var i = 0; i < liste.length; i++) {
      var n = liste[i];
      if (!n.active) continue;
      try {
        if (localStorage.getItem(LS_PREFIX + n.id)) continue;
      } catch (e) {}
      return n; /* première notification active et non refusée */
    }
    return null;
  }

  /* ─── Point d'entrée ─────────────────────────────────── */
  function init() {
    injectStyles();

    fetch(JSON_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("notifications.json introuvable");
        return r.json();
      })
      .then(function (liste) {
        var notif = pickNotification(liste);
        if (!notif) return;

        var delai = (notif.delai || 20) * 1000;
        setTimeout(function () { showToast(notif); }, delai);
      })
      .catch(function (err) {
        /* Silencieux en production */
        if (typeof console !== "undefined") {
          console.warn("[Albexia Notif]", err.message);
        }
      });
  }

  /* Lancer après chargement du DOM */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

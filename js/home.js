/* ════════════════════════════════════════════════════════════
   REMNANT — Home page JS (clock, GSAP animations, smoke)
════════════════════════════════════════════════════════════ */

// Moscow clock
function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const el = document.getElementById('hero-time');
  if (el) el.textContent = `Москва · ${h}:${m}:${s}`;
}
updateTime();
setInterval(updateTime, 1000);

/* ═══════════════════════════════════════════
   CURSOR LIGHT — radial glow follows cursor
═══════════════════════════════════════════ */
(function initCursorLight() {
  const light = document.getElementById('cursor-light');
  if (!light) return;
  let lx = window.innerWidth / 2, ly = window.innerHeight / 2;
  let tx = lx, ty = ly;
  let active = false, hideTimer;

  document.addEventListener('mousemove', e => {
    tx = e.clientX; ty = e.clientY;
    if (!active) { active = true; light.style.opacity = '1'; }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { active = false; light.style.opacity = '0'; }, 3000);
  }, { passive: true });

  function tick() {
    lx += (tx - lx) * 0.09;
    ly += (ty - ly) * 0.09;
    light.style.left = lx + 'px';
    light.style.top  = ly + 'px';
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ═══════════════════════════════════════════
   HERO SPLITE — cursor-reactive split line
═══════════════════════════════════════════ */
(function initSplite() {
  const line  = document.getElementById('splite-line');
  const glow  = document.getElementById('splite-glow');
  if (!line || !glow) return;

  let targetX = 50, currentX = 50;
  let glowX = 0, glowY = 0, glowTX = 0, glowTY = 0;
  let onHero = false;
  const hero = document.getElementById('hero');

  document.addEventListener('mousemove', e => {
    glowTX = e.clientX; glowTY = e.clientY;
    if (hero) {
      const r = hero.getBoundingClientRect();
      onHero = e.clientY >= r.top && e.clientY <= r.bottom;
    }
    if (onHero) {
      targetX = (e.clientX / window.innerWidth) * 100;
      glow.style.opacity = '1';
    } else {
      glow.style.opacity = '0';
    }
  }, { passive: true });

  function tick() {
    currentX += (targetX - currentX) * 0.05;
    glowX += (glowTX - glowX) * 0.07;
    glowY += (glowTY - glowY) * 0.07;
    line.style.left = currentX + '%';
    glow.style.left = glowX + 'px';
    glow.style.top  = glowY + 'px';
    requestAnimationFrame(tick);
  }
  tick();
})();

// GSAP animations
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // ── Info strips: slide-in from side ─────────────────────
  // CSS задаёт начальный transform: translateX(±80px) и opacity:0
  // GSAP анимирует к финальному состоянию
  document.querySelectorAll('.info-strip').forEach(strip => {
    gsap.to(strip, {
      opacity: 1,
      x: 0,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: strip,
        start: 'top 88%',
        end: 'top 55%',
        scrub: 1.2,
      }
    });
  });

  // ── Master lead: fade up + scale ────────────────────────
  const masterLead = document.querySelector('.master-lead');
  if (masterLead) {
    gsap.fromTo(masterLead,
      { opacity: 0, y: 60 },
      {
        opacity: 1, y: 0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: masterLead,
          start: 'top 85%',
          end: 'top 50%',
          scrub: 1.2,
        }
      }
    );
  }

  // ── Glass cards: entrance ───────────────────────────────
  document.querySelectorAll('.glass-card').forEach(card => {
    gsap.fromTo(card,
      { opacity: 0, y: 60, scale: 0.98 },
      {
        opacity: 1, y: 0, scale: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 88%', end: 'top 50%', scrub: 1.5 }
      }
    );

    const inner = card.querySelectorAll('.section-label, h2, .section-title, .master-spec, .master-bio, .about-stats .stat, .portfolio-grid .portfolio-item, .faq-item');
    if (inner.length) {
      gsap.fromTo(inner,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          ease: 'power2.out', stagger: 0.06,
          scrollTrigger: { trigger: card, start: 'top 82%', end: 'top 30%', scrub: 1.5 }
        }
      );
    }
  });
}

/* ═══════════════════════════════════════════════════════
   FLAT HORIZONTAL GALLERY
═══════════════════════════════════════════════════════ */
(function initCircGallery() {
  const outer = document.getElementById('circGallery');
  const stage = document.getElementById('circStage');
  if (!outer || !stage) return;

  const items = Array.from(stage.querySelectorAll('.circ-item'));
  const n = items.length;

  // Scroll thumb
  const scrollThumb = document.getElementById('circScrollThumb');
  function updateScrollThumb() {
    if (!scrollThumb) return;
    const max = stage.scrollWidth - stage.clientWidth;
    if (max <= 0) return;
    const pct = stage.scrollLeft / max;
    scrollThumb.style.left = (pct * 72) + '%';
  }
  stage.addEventListener('scroll', updateScrollThumb, { passive: true });

  // Arrow buttons
  const btnPrev = document.getElementById('galleryPrev');
  const btnNext = document.getElementById('galleryNext');
  const CARD_W = window.innerWidth <= 768 ? 234 : 400;
  if (btnPrev) btnPrev.addEventListener('click', () => {
    stage.scrollBy({ left: -CARD_W, behavior: 'smooth' });
  });
  if (btnNext) btnNext.addEventListener('click', () => {
    stage.scrollBy({ left: CARD_W, behavior: 'smooth' });
  });

  // Lightbox
  const lb      = document.getElementById('circLightbox');
  const lbImg   = document.getElementById('circLbImg');
  const lbCap   = document.getElementById('circLbCaption');
  const lbClose = document.getElementById('circLbClose');
  const lbPrev  = document.getElementById('circLbPrev');
  const lbNext  = document.getElementById('circLbNext');
  const lbBack  = document.getElementById('circLbBackdrop');
  let lbIndex = 0;

  function openLb(index) {
    lbIndex = ((index % n) + n) % n;
    const el = items[lbIndex];
    lbImg.src = el.dataset.full || el.querySelector('img')?.src || '';
    lbImg.alt = el.dataset.alt || '';
    if (lbCap) lbCap.textContent = lbImg.alt;
    lb.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    lb.classList.add('hidden');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  // Click-vs-drag: flag as drag only when pointer moves > 12px (more tolerant on touch)
  let pointerDownX = 0, pointerDownY = 0, pointerMoved = false;
  stage.addEventListener('pointerdown', e => { pointerDownX = e.clientX; pointerDownY = e.clientY; pointerMoved = false; }, { passive: true });
  stage.addEventListener('pointermove', e => {
    if (Math.abs(e.clientX - pointerDownX) > 12 || Math.abs(e.clientY - pointerDownY) > 12) pointerMoved = true;
  }, { passive: true });
  items.forEach((el, i) => {
    el.addEventListener('click', () => { if (!pointerMoved) openLb(i); });
  });

  if (lb) {
    lbClose?.addEventListener('click', closeLb);
    lbBack?.addEventListener('click', closeLb);
    lbPrev?.addEventListener('click', () => openLb(lbIndex - 1));
    lbNext?.addEventListener('click', () => openLb(lbIndex + 1));

    // Swipe in lightbox (mobile)
    let lbTouchX = 0, lbTouchY = 0;
    lb.addEventListener('touchstart', e => {
      lbTouchX = e.touches[0].clientX;
      lbTouchY = e.touches[0].clientY;
    }, { passive: true });
    lb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - lbTouchX;
      const dy = e.changedTouches[0].clientY - lbTouchY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        dx < 0 ? openLb(lbIndex + 1) : openLb(lbIndex - 1);
      } else if (dy > 80 && Math.abs(dx) < 40) {
        closeLb();
      }
    }, { passive: true });
  }
  document.addEventListener('keydown', e => {
    if (!lb || lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft')  openLb(lbIndex - 1);
    if (e.key === 'ArrowRight') openLb(lbIndex + 1);
  });
})();

// Hero text initially hidden (shown by hero-3d.js after model loads,
// or after 4s fallback if 3D fails to load)
const heroText = document.getElementById('hero-text');
if (heroText) {
  heroText.style.opacity = '0';
  heroText.style.transform = 'translateY(30px)';
  setTimeout(() => {
    if (heroText.style.opacity === '0') {
      heroText.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
      heroText.style.opacity = '1';
      heroText.style.transform = 'none';
    }
  }, 4000);

  // Remove frosted-glass blur on first scroll
  let blurRemoved = false;
  window.addEventListener('scroll', () => {
    if (!blurRemoved && window.scrollY > 20) {
      blurRemoved = true;
      heroText.classList.add('hero-scrolled');
    }
  }, { passive: true });
}

// Sound button click — delegates to AmbientAudio when ready
document.getElementById('sound-btn')?.addEventListener('click', () => {
  if (typeof AmbientAudio !== 'undefined') AmbientAudio.toggle();
});

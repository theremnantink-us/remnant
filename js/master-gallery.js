/* master-gallery.js — hydrates .portfolio-grid from Supabase + lightbox */
import { supabase } from './supabase-config.js';

(async function() {
  const grid = document.querySelector('.portfolio-section .portfolio-grid');
  if (!grid) return;

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('storage_path, caption')
    .eq('visible', true)
    .order('sort_order', { ascending: true })
    .limit(24);

  if (!error && data && data.length > 0) {
    function publicUrl(path) {
      const { data: u } = supabase.storage.from('portfolio').getPublicUrl(path);
      return u.publicUrl;
    }
    grid.innerHTML = '';
    data.forEach(item => {
      const url = publicUrl(item.storage_path);
      const div = document.createElement('div');
      div.className = 'portfolio-item';
      const img = document.createElement('img');
      img.src = url;
      img.alt = item.caption || '';
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      div.appendChild(img);
      grid.appendChild(div);
    });
  }

  // Init lightbox for whatever items are in the grid (static or Supabase)
  const items  = Array.from(grid.querySelectorAll('.portfolio-item'));
  const n      = items.length;
  const lb     = document.getElementById('masterLightbox');
  const lbImg  = document.getElementById('masterLbImg');
  const lbCap  = document.getElementById('masterLbCaption');
  const lbClose = document.getElementById('masterLbClose');
  const lbPrev = document.getElementById('masterLbPrev');
  const lbNext = document.getElementById('masterLbNext');
  const lbBack = document.getElementById('masterLbBackdrop');
  if (!lb || !lbImg || n === 0) return;

  let lbIndex = 0;

  function openLb(index) {
    lbIndex = ((index % n) + n) % n;
    const el = items[lbIndex];
    const img = el.querySelector('img');
    lbImg.src = el.dataset.full || img?.src || '';
    lbImg.alt = el.dataset.alt || img?.alt || '';
    if (lbCap) lbCap.textContent = lbImg.alt;
    lb.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    lb.classList.add('hidden');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  // Per-item tap detection (reliable on CSS grid, no scroll-container interference)
  items.forEach((el, i) => {
    let tx = 0, ty = 0, isTap = false;
    el.addEventListener('touchstart', e => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
      isTap = true;
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (isTap && (Math.abs(e.touches[0].clientX - tx) > 10 || Math.abs(e.touches[0].clientY - ty) > 10)) {
        isTap = false;
      }
    }, { passive: true });
    el.addEventListener('touchend', e => {
      if (isTap) { e.preventDefault(); openLb(i); }
      isTap = false;
    }, { passive: false });
    el.addEventListener('click', () => openLb(i));
  });

  lbClose?.addEventListener('click', closeLb);
  lbBack?.addEventListener('click', closeLb);
  lbPrev?.addEventListener('click', () => openLb(lbIndex - 1));
  lbNext?.addEventListener('click', () => openLb(lbIndex + 1));

  // Keyboard
  document.addEventListener('keydown', e => {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
    if (e.key === 'ArrowRight') openLb(lbIndex + 1);
  });

  // Touch swipe inside lightbox (navigate + close-on-pull-down)
  let swTouchX = 0, swTouchY = 0, swSwiping = false, swLocked = false, swAnimating = false;
  const SWIPE_MS = 280;
  const SWIPE_EASE = 'cubic-bezier(.22,1,.36,1)';

  lb.addEventListener('touchstart', e => {
    if (swAnimating || e.touches.length !== 1) return;
    swTouchX  = e.touches[0].clientX;
    swTouchY  = e.touches[0].clientY;
    swSwiping = true;
    swLocked  = false;
    lbImg.style.transition = 'none';
  }, { passive: true });

  lb.addEventListener('touchmove', e => {
    if (!swSwiping || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - swTouchX;
    const dy = e.touches[0].clientY - swTouchY;
    if (!swLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swLocked = true;
      if (Math.abs(dy) > Math.abs(dx)) { swSwiping = false; return; }
    }
    if (!swLocked) return;
    e.preventDefault();
    const progress = Math.min(Math.abs(dx) / 300, 1);
    lbImg.style.transform = `translateX(${dx}px) scale(${1 - progress * 0.08})`;
    lbImg.style.opacity    = String(1 - progress * 0.5);
  }, { passive: false });

  lb.addEventListener('touchend', e => {
    if (!swSwiping) return;
    swSwiping = false;
    const dx = e.changedTouches[0].clientX - swTouchX;
    const dy = e.changedTouches[0].clientY - swTouchY;
    const dt = Date.now();
    const vx = Math.abs(dx) / Math.max(dt, 1);
    const shouldSwipe = Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 50 || vx > 0.3);

    if (shouldSwipe) {
      swAnimating = true;
      const dir = dx > 0 ? 1 : -1;
      lbImg.style.transition = `transform ${SWIPE_MS * 0.7}ms ${SWIPE_EASE}, opacity ${SWIPE_MS * 0.5}ms ease`;
      lbImg.style.transform  = `translateX(${dir * 110}vw) scale(.85)`;
      lbImg.style.opacity    = '0';
      setTimeout(() => {
        lbIndex = (lbIndex - dir + n) % n;
        const el = items[lbIndex];
        lbImg.src = el.dataset.full || el.querySelector('img')?.src || '';
        lbImg.alt = el.dataset.alt  || el.querySelector('img')?.alt || '';
        if (lbCap) lbCap.textContent = lbImg.alt;
        lbImg.style.transition = 'none';
        lbImg.style.transform  = `translateX(${-dir * 50}vw) scale(.92)`;
        lbImg.style.opacity    = '0';
        void lbImg.offsetWidth;
        lbImg.style.transition = `transform ${SWIPE_MS}ms ${SWIPE_EASE}, opacity ${SWIPE_MS * 0.7}ms ease`;
        lbImg.style.transform  = 'translateX(0) scale(1)';
        lbImg.style.opacity    = '1';
        setTimeout(() => {
          lbImg.style.transition = lbImg.style.transform = lbImg.style.opacity = '';
          swAnimating = false;
        }, SWIPE_MS);
      }, SWIPE_MS * 0.5);
    } else if (dy > 90 && Math.abs(dx) < 50) {
      closeLb();
    } else {
      lbImg.style.transition = `transform ${SWIPE_MS}ms ${SWIPE_EASE}, opacity ${SWIPE_MS * 0.6}ms ease`;
      lbImg.style.transform  = 'translateX(0) scale(1)';
      lbImg.style.opacity    = '1';
      setTimeout(() => { lbImg.style.transition = lbImg.style.transform = lbImg.style.opacity = ''; }, SWIPE_MS);
    }
  }, { passive: true });
})();

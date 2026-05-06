/* ════════════════════════════════════════════════════════════
   REMNANT — Lightbox with slide animation + touch swipe
════════════════════════════════════════════════════════════ */

(function() {
  const items = Array.from(document.querySelectorAll('.portfolio-item[data-lightbox]'));
  if (!items.length) return;

  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  if (!lb || !lbImg) return;

  let current = 0;
  let animating = false;
  const ANIM_MS = 320;
  const EASE = 'cubic-bezier(.22,1,.36,1)';

  function show(idx) {
    current = (idx + items.length) % items.length;
    lbImg.src = items[current].dataset.lightbox;
    lbImg.alt = items[current].querySelector('img').alt;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function slideTo(idx, dir) {
    if (animating) return;
    const newIdx = (idx + items.length) % items.length;
    if (newIdx === current) return;
    animating = true;

    lbImg.style.transition = `transform ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS}ms ease`;
    lbImg.style.transform = `translateX(${dir * 100}vw) scale(.88)`;
    lbImg.style.opacity = '0';

    setTimeout(() => {
      lbImg.style.transition = 'none';
      lbImg.style.transform = `translateX(${-dir * 60}vw) scale(.92)`;
      lbImg.style.opacity = '0';
      current = newIdx;
      lbImg.src = items[current].dataset.lightbox;
      lbImg.alt = items[current].querySelector('img').alt;

      void lbImg.offsetWidth;

      lbImg.style.transition = `transform ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS * 0.8}ms ease`;
      lbImg.style.transform = 'translateX(0) scale(1)';
      lbImg.style.opacity = '1';

      setTimeout(() => {
        lbImg.style.transition = '';
        lbImg.style.transform = '';
        lbImg.style.opacity = '';
        animating = false;
      }, ANIM_MS);
    }, ANIM_MS * 0.65);
  }

  function close() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.style.transition = '';
    lbImg.style.transform = '';
    lbImg.style.opacity = '';
    animating = false;
  }

  items.forEach((el, i) => el.addEventListener('click', () => show(i)));
  document.getElementById('lb-close').addEventListener('click', close);
  document.getElementById('lb-prev').addEventListener('click', () => slideTo(current - 1, 1));
  document.getElementById('lb-next').addEventListener('click', () => slideTo(current + 1, -1));
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowRight') slideTo(current + 1, -1);
    if (e.key === 'ArrowLeft')  slideTo(current - 1, 1);
  });

  // Touch swipe
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0, swiping = false, locked = false;

  lb.addEventListener('touchstart', e => {
    if (animating || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    swiping = true;
    locked = false;
    lbImg.style.transition = 'none';
  }, { passive: true });

  lb.addEventListener('touchmove', e => {
    if (!swiping || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    if (!locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      locked = true;
      if (Math.abs(dy) > Math.abs(dx)) { swiping = false; return; }
    }
    if (!locked) return;

    e.preventDefault();
    const progress = Math.min(Math.abs(dx) / 300, 1);
    const scale = 1 - progress * 0.08;
    const opacity = 1 - progress * 0.5;
    lbImg.style.transform = `translateX(${dx}px) scale(${scale})`;
    lbImg.style.opacity = opacity;
  }, { passive: false });

  lb.addEventListener('touchend', e => {
    if (!swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const vx = Math.abs(dx) / dt;

    const shouldSwipe = Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 50 || vx > 0.3);

    if (shouldSwipe) {
      const dir = dx > 0 ? 1 : -1;
      animating = true;

      lbImg.style.transition = `transform ${ANIM_MS * 0.7}ms ${EASE}, opacity ${ANIM_MS * 0.5}ms ease`;
      lbImg.style.transform = `translateX(${dir * 110}vw) scale(.85)`;
      lbImg.style.opacity = '0';

      setTimeout(() => {
        lbImg.style.transition = 'none';
        current = (current - dir + items.length) % items.length;
        lbImg.src = items[current].dataset.lightbox;
        lbImg.alt = items[current].querySelector('img').alt;
        lbImg.style.transform = `translateX(${-dir * 50}vw) scale(.92)`;
        lbImg.style.opacity = '0';

        void lbImg.offsetWidth;

        lbImg.style.transition = `transform ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS * 0.7}ms ease`;
        lbImg.style.transform = 'translateX(0) scale(1)';
        lbImg.style.opacity = '1';

        setTimeout(() => {
          lbImg.style.transition = '';
          lbImg.style.transform = '';
          lbImg.style.opacity = '';
          animating = false;
        }, ANIM_MS);
      }, ANIM_MS * 0.5);
    } else {
      lbImg.style.transition = `transform ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS * 0.6}ms ease`;
      lbImg.style.transform = 'translateX(0) scale(1)';
      lbImg.style.opacity = '1';
      setTimeout(() => {
        lbImg.style.transition = '';
        lbImg.style.transform = '';
        lbImg.style.opacity = '';
      }, ANIM_MS);
    }
  }, { passive: true });
})();

/* ════════════════════════════════════════════════════════════
   REMNANT — Common JS (shared across all pages)
   Nav scroll, burger menu, cabinet token, fade-up observer
════════════════════════════════════════════════════════════ */

// Nav scroll effect
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
}

// Mobile menu
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');
if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
}

function closeMobileMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove('open');
  burger.classList.remove('open');
  document.body.style.overflow = '';
}
window.closeMobileMenu = closeMobileMenu;

// Nav avatar — shown when user is logged in (cached from cabinet session)
(function() {
  try {
    const avatarUrl = localStorage.getItem('remnant_avatar_url');
    const userName  = localStorage.getItem('remnant_user_name');
    if (!avatarUrl && !userName) return;

    const navAvatar   = document.getElementById('nav-avatar');
    const navImg      = document.getElementById('nav-avatar-img');
    const navInitials = document.getElementById('nav-avatar-initials');
    const navIcon     = document.getElementById('nav-cabinet-icon');
    const navText     = document.getElementById('nav-cabinet-text');

    if (!navAvatar) return;

    navAvatar.style.display = 'flex';
    if (navIcon) navIcon.style.display = 'none';
    if (navText) navText.style.display = 'none';

    if (avatarUrl && navImg) {
      navImg.src = avatarUrl;
      navImg.style.display = 'block';
      navAvatar.classList.add('has-photo');
      navImg.onerror = function() {
        // Image failed — show initials instead
        this.style.display = 'none';
        navAvatar.classList.remove('has-photo');
        if (navInitials && userName) {
          navInitials.textContent = userName.split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0, 2);
          navInitials.style.display = 'block';
        }
      };
    } else if (userName && navInitials) {
      navInitials.textContent = userName.split(' ').map(function(w){ return w[0]; }).join('').toUpperCase().slice(0, 2);
      navInitials.style.display = 'block';
      if (navImg) navImg.style.display = 'none';
      navAvatar.classList.remove('has-photo');
    }

    // Live-update when cabinet broadcasts new avatar
    window.addEventListener('remnant:avatar', function(e) {
      const url = e?.detail?.url;
      if (url && navImg) {
        navImg.src = url;
        navImg.style.display = 'block';
        if (navInitials) navInitials.style.display = 'none';
        navAvatar.classList.add('has-photo');
      }
    });

    // Cross-tab update
    window.addEventListener('storage', function(e) {
      if (e.key === 'remnant_avatar_url' && e.newValue && navImg) {
        navImg.src = e.newValue;
        navImg.style.display = 'block';
        if (navInitials) navInitials.style.display = 'none';
        navAvatar.classList.add('has-photo');
      }
    });
  } catch {}
})();

// Scroll fade-in observer
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      fadeObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

// FAQ accordion (if present on page)
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// Service Worker registration (push notifications + offline support)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

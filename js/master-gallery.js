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

  items.forEach((el, i) => el.addEventListener('click', () => openLb(i)));
  lbClose?.addEventListener('click', closeLb);
  lbBack?.addEventListener('click', closeLb);
  lbPrev?.addEventListener('click', () => openLb(lbIndex - 1));
  lbNext?.addEventListener('click', () => openLb(lbIndex + 1));
  document.addEventListener('keydown', e => {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
    if (e.key === 'ArrowRight') openLb(lbIndex + 1);
  });
})();

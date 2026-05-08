/* master-gallery.js — hydrates .portfolio-grid from Supabase portfolio_items */
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

  if (error || !data || data.length === 0) return; // keep static fallback

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
})();

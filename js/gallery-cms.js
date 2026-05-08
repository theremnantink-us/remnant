/* gallery-cms.js — replaces static carousel items with Supabase portfolio_items */
import { supabase } from './supabase-config.js';

(async function hydrateGallery() {
  const stage = document.getElementById('circStage');
  if (!stage) return;

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('storage_path, caption')
    .eq('visible', true)
    .order('sort_order', { ascending: true })
    .limit(12);

  if (error || !data || data.length === 0) return; // keep static fallback

  // Build public URL helper
  function publicUrl(path) {
    const { data: u } = supabase.storage.from('portfolio').getPublicUrl(path);
    return u.publicUrl;
  }

  // Replace stage children
  stage.innerHTML = '';
  data.forEach(item => {
    const url = publicUrl(item.storage_path);
    const div = document.createElement('div');
    div.className = 'circ-item';
    div.dataset.full = url;
    div.dataset.alt  = item.caption || '';
    const img = document.createElement('img');
    img.src     = url;
    img.alt     = item.caption || '';
    img.loading = 'lazy';
    div.appendChild(img);
    stage.appendChild(div);
  });

  // Re-init gallery positioning (home.js may have already run; re-trigger on mobile too)
  window.dispatchEvent(new Event('remnant:gallery-update'));
})();

/* ══════════════════════════════════════
   REMNANT — Radial Orbital Navigation
   Vanilla JS port. No framework.

   Usage:
     import { createOrbital } from './orbital-nav.js';
     const orbit = createOrbital(container, {
       nodes: [
         { id: 1, title: 'Записи', icon: svgString, badge: '3',
           status: 'in-progress', energy: 70, date: '',
           content: 'Описание...', relatedIds: [2, 5],
           onActivate: () => switchTab('bookings'),
           ctaLabel: 'Открыть', ctaHref: '#' }
       ],
       center: { type: 'text'|'initials'|'image', value: 'R' | 'BM' | 'url' },
       radius: 200,
       autoRotate: true,
       onHubClick: () => {}
     });
     orbit.setCenter({ type: 'image', value: url });
     orbit.updateNode(id, { badge: '5' });
     orbit.destroy();
══════════════════════════════════════ */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(htmlString) {
  const wrap = document.createElement('div');
  wrap.innerHTML = htmlString.trim();
  return wrap.firstChild;
}

function statusChipText(status) {
  if (status === 'completed')   return 'Готово';
  if (status === 'in-progress') return 'Активно';
  return 'Доступно';
}

export function createOrbital(container, opts = {}) {
  const {
    nodes = [],
    center = { type: 'text', value: 'R' },
    radius = 200,
    autoRotate = true,
    onHubClick = null,
    hint = 'Кликните на узел — откроется раздел · Центр — общий вид',
  } = opts;

  // ── State ───────────────────────────────────
  const state = {
    rotation: 0,
    auto: autoRotate,
    expandedId: null,
    pulsingIds: new Set(),
    nodes,
    radius,
    timer: null,
  };

  // ── DOM skeleton ────────────────────────────
  container.classList.add('orbital');
  container.innerHTML = `
    <div class="orbital__stage">
      <div class="orbital__field" data-orbital-field>
        <div class="orbital__ring orbital__ring--outer"></div>
        <div class="orbital__ring"></div>
        <div class="orbital__hub" data-orbital-hub>
          <div class="orbital__hub-core" data-orbital-hub-core></div>
        </div>
      </div>
      ${hint ? `<div class="orbital__hint">${hint}</div>` : ''}
    </div>
  `;

  const field = container.querySelector('[data-orbital-field]');
  const hub = container.querySelector('[data-orbital-hub]');
  const hubCore = container.querySelector('[data-orbital-hub-core]');

  // ── Hub setup ───────────────────────────────
  function renderCenter(c) {
    hubCore.innerHTML = '';
    hub.classList.remove('orbital__hub--photo');
    if (c.type === 'image' && c.value) {
      const img = document.createElement('img');
      img.src = c.value;
      img.alt = '';
      hubCore.appendChild(img);
      hub.classList.add('orbital__hub--photo');
    } else if (c.type === 'initials') {
      const span = document.createElement('span');
      span.className = 'orbital__hub-core-initials';
      span.textContent = c.value || '?';
      hubCore.appendChild(span);
    } else {
      const span = document.createElement('span');
      span.className = 'orbital__hub-core-text';
      span.textContent = c.value || 'R';
      hubCore.appendChild(span);
    }
  }
  renderCenter(center);

  hub.addEventListener('click', (e) => {
    e.stopPropagation();
    collapseAll();
    if (typeof onHubClick === 'function') onHubClick();
  });

  // ── Build nodes ─────────────────────────────
  const nodeEls = new Map();
  nodes.forEach((n) => {
    const el = document.createElement('div');
    el.className = 'orbital__node';
    el.dataset.id = n.id;
    el.innerHTML = `
      <div class="orbital__node-glow"></div>
      <div class="orbital__node-dot" data-dot>${n.icon || ''}</div>
      ${n.badge ? `<span class="orbital__node-badge" data-badge>${n.badge}</span>` : ''}
      <div class="orbital__node-label">${n.title}</div>
    `;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNode(n.id);
    });
    el.style.setProperty('--node-index', String(nodes.indexOf(n)));
    field.appendChild(el);
    nodeEls.set(n.id, el);
  });

  // Click backdrop to collapse
  container.addEventListener('click', (e) => {
    if (e.target === container || e.target === field
        || e.target.classList.contains('orbital__stage')
        || e.target.classList.contains('orbital__ring')) {
      collapseAll();
    }
  });

  // ── Position calculator ─────────────────────
  function positionNodes() {
    const total = state.nodes.length;
    state.nodes.forEach((n, i) => {
      const el = nodeEls.get(n.id);
      if (!el) return;
      const angle = ((i / total) * 360 + state.rotation) % 360;
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * state.radius;
      const y = Math.sin(rad) * state.radius;
      const z = Math.round(100 + 50 * Math.cos(rad));
      const opacity = Math.max(0.5, 0.5 + 0.5 * ((1 + Math.sin(rad)) / 2));
      const expanded = state.expandedId === n.id;
      el.style.setProperty('--tx', `${x}px`);
      el.style.setProperty('--ty', `${y}px`);
      el.style.setProperty('--final-opacity', expanded ? 1 : opacity);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.zIndex = expanded ? 400 : z;
      el.style.opacity = expanded ? 1 : opacity;
    });
  }

  // ── Auto-rotate ─────────────────────────────
  function startTimer() {
    if (state.timer) return;
    const RAMP_MS = 1200;
    const TARGET_SPEED = 0.25;
    const start = performance.now();
    state.timer = setInterval(() => {
      if (!state.auto) return;
      const elapsed = performance.now() - start;
      const speed = elapsed < RAMP_MS
        ? TARGET_SPEED * (elapsed / RAMP_MS)
        : TARGET_SPEED;
      state.rotation = (state.rotation + speed) % 360;
      positionNodes();
    }, 50);
  }
  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
  }

  // Mark initializing for one-shot CSS animation
  container.classList.add('orbital--initializing');
  setTimeout(() => container.classList.remove('orbital--initializing'), 1400);

  startTimer();

  // ── Center on node ──────────────────────────
  function centerOnNode(id) {
    const idx = state.nodes.findIndex((n) => n.id === id);
    if (idx < 0) return;
    const total = state.nodes.length;
    const targetAngle = (idx / total) * 360;
    state.rotation = (270 - targetAngle + 360) % 360;
    positionNodes();
  }

  // ── Expand / collapse ───────────────────────
  function openCard(node, el) {
    const existing = el.querySelector('.orbital__card');
    if (existing) return;
    const card = document.createElement('div');
    card.className = 'orbital__card';
    card.addEventListener('click', (e) => e.stopPropagation());

    const rel = (node.relatedIds || [])
      .map((rid) => state.nodes.find((x) => x.id === rid))
      .filter(Boolean);

    card.innerHTML = `
      <div class="orbital__card-head">
        <span class="orbital__card-chip orbital__card-chip--${node.status || 'pending'}">${statusChipText(node.status)}</span>
        ${node.date ? `<span class="orbital__card-meta">${node.date}</span>` : ''}
      </div>
      <div class="orbital__card-title">${node.title}</div>
      <div class="orbital__card-body">${node.content || ''}</div>
      ${typeof node.energy === 'number' ? `
        <div class="orbital__card-progress">
          <div class="orbital__card-progress-labels">
            <span>${node.energyLabel || 'Прогресс'}</span>
            <span>${node.energy}%</span>
          </div>
          <div class="orbital__card-progress-bar">
            <div class="orbital__card-progress-fill" style="width:${Math.max(0, Math.min(100, node.energy))}%"></div>
          </div>
        </div>` : ''}
      ${rel.length ? `
        <div class="orbital__card-related">
          <div class="orbital__card-related-title">Связано</div>
          <div class="orbital__card-related-row">
            ${rel.map((r) => `
              <button class="orbital__card-related-btn" data-rel="${r.id}">
                ${r.title}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            `).join('')}
          </div>
        </div>` : ''}
      ${node.ctaLabel ? (node.ctaHref
        ? `<a class="orbital__card-cta" href="${node.ctaHref}">${node.ctaLabel}</a>`
        : `<button class="orbital__card-cta" data-cta>${node.ctaLabel}</button>`) : ''}
    `;

    card.querySelectorAll('[data-rel]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNode(Number(b.dataset.rel));
      });
    });
    const ctaBtn = card.querySelector('[data-cta]');
    if (ctaBtn && typeof node.onActivate === 'function') {
      ctaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        node.onActivate();
        collapseAll();
      });
    }
    el.appendChild(card);
  }

  function toggleNode(id) {
    const node = state.nodes.find((n) => n.id === id);
    if (!node) return;

    // Double-click activates (calls onActivate if present)
    if (state.expandedId === id) {
      collapseAll();
      return;
    }

    // collapse other expanded
    if (state.expandedId !== null) {
      const prev = nodeEls.get(state.expandedId);
      if (prev) {
        prev.classList.remove('is-expanded');
        const card = prev.querySelector('.orbital__card');
        if (card) card.remove();
      }
    }

    state.expandedId = id;
    state.auto = false;

    // pulse related
    state.pulsingIds = new Set(node.relatedIds || []);
    nodeEls.forEach((el, nid) => {
      el.classList.toggle('is-pulsing', state.pulsingIds.has(nid));
      el.classList.toggle('is-related', state.pulsingIds.has(nid));
    });

    const el = nodeEls.get(id);
    if (el) {
      el.classList.add('is-expanded');
      openCard(node, el);
    }
    centerOnNode(id);
  }

  function collapseAll() {
    if (state.expandedId === null) {
      state.auto = autoRotate;
      return;
    }
    const el = nodeEls.get(state.expandedId);
    if (el) {
      el.classList.remove('is-expanded');
      const card = el.querySelector('.orbital__card');
      if (card) card.remove();
    }
    state.expandedId = null;
    state.pulsingIds.clear();
    nodeEls.forEach((el) => {
      el.classList.remove('is-pulsing', 'is-related');
    });
    state.auto = autoRotate;
  }

  // ── Pause rotation on hover (nicer UX) ──────
  container.addEventListener('mouseenter', () => { if (state.expandedId === null) state.auto = false; });
  container.addEventListener('mouseleave', () => { if (state.expandedId === null) state.auto = autoRotate; });

  // Initial layout
  positionNodes();

  // ── Public API ──────────────────────────────
  return {
    setCenter(c) { renderCenter(c); },
    updateNode(id, patch) {
      const n = state.nodes.find((x) => x.id === id);
      if (!n) return;
      Object.assign(n, patch);
      const el = nodeEls.get(id);
      if (!el) return;
      // Update badge
      let badge = el.querySelector('[data-badge]');
      if (patch.badge !== undefined) {
        if (patch.badge) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'orbital__node-badge';
            badge.dataset.badge = '';
            el.appendChild(badge);
          }
          badge.textContent = patch.badge;
        } else if (badge) {
          badge.remove();
        }
      }
      // Update label
      if (patch.title !== undefined) {
        const lbl = el.querySelector('.orbital__node-label');
        if (lbl) lbl.textContent = patch.title;
      }
      // Refresh open card if this is the expanded one
      if (state.expandedId === id) {
        const card = el.querySelector('.orbital__card');
        if (card) card.remove();
        openCard(n, el);
      }
    },
    open(id) { toggleNode(id); },
    close() { collapseAll(); },
    destroy() {
      stopTimer();
      container.classList.remove('orbital');
      container.innerHTML = '';
    },
  };
}

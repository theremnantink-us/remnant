// REMNANT Figma Plugin — Page Mockups Generator
// Compatible with Figma jsvm (Duktape / emscripten).
// NO object spread ({...x}) — use Object.assign() instead.
// NO array spread in unsupported positions — use concat/slice.

// ─── Design tokens ────────────────────────────────────────────────────────────

var C = {
  bg:        { r: 0.0314, g: 0.0314, b: 0.0314 },  // #080808
  surface:   { r: 0.0588, g: 0.0588, b: 0.0588 },  // #0f0f0f
  surface2:  { r: 0.0863, g: 0.0863, b: 0.0863 },  // #161616
  surface3:  { r: 0.1098, g: 0.1098, b: 0.1098 },  // #1c1c1c
  text:      { r: 0.9098, g: 0.8902, b: 0.8627 },  // #e8e3dc
  muted:     { r: 0.4314, g: 0.4000, b: 0.3765 },  // #6e6660
  accent:    { r: 0.7686, g: 0.6588, b: 0.5098 },  // #c4a882
  border:    { r: 0.1216, g: 0.1216, b: 0.1216 },  // #1f1f1f
  white:     { r: 1.0000, g: 1.0000, b: 1.0000 },
};

var ALPHA_FULL  = 1;
var ALPHA_MED   = 0.6;
var ALPHA_LOW   = 0.3;

// ─── Page definitions ────────────────────────────────────────────────────────

var PAGE_DEFS = {
  home: {
    name: 'Home',
    file: 'index.html',
    sections: [
      { id: 'hero',      label: 'Hero — 3D Animation + CTA',          h: 700, accent: true },
      { id: 'about',     label: 'About the Artist',                    h: 300 },
      { id: 'portfolio', label: 'Portfolio Grid (6 images)',           h: 520 },
      { id: 'faq-prev',  label: 'FAQ Preview (3 items)',               h: 260 },
      { id: 'footer',    label: 'Footer',                              h: 200, footer: true },
    ],
  },
  master: {
    name: 'Master',
    file: 'master.html',
    sections: [
      { id: 'hero',         label: 'Artist Hero — Full Width Photo',   h: 600, accent: true },
      { id: 'bio',          label: 'Biography & Style',                h: 380 },
      { id: 'portfolio',    label: 'Portfolio Gallery',                h: 520 },
      { id: 'testimonials', label: 'Testimonials (3 cards)',           h: 300 },
      { id: 'footer',       label: 'Footer',                          h: 200, footer: true },
    ],
  },
  booking: {
    name: 'Booking',
    file: 'booking.html',
    sections: [
      { id: 'step1', label: 'Step 1 — Pick a Date (calendar)',        h: 480, accent: true },
      { id: 'step2', label: 'Step 2 — Pick a Time Slot',              h: 320 },
      { id: 'step3', label: 'Step 3 — Your Details (form)',           h: 420 },
      { id: 'footer', label: 'Footer',                                h: 200, footer: true },
    ],
  },
  cabinet: {
    name: 'Cabinet',
    file: 'cabinet.html',
    sections: [
      { id: 'login',     label: 'Login — Phone + Password',          h: 440, accent: true },
      { id: 'profile',   label: 'Profile Card',                      h: 220 },
      { id: 'bookings',  label: 'My Bookings List',                  h: 360 },
      { id: 'notif',     label: 'Notifications Inbox',               h: 260 },
    ],
  },
  admin: {
    name: 'Admin',
    file: 'admin.html',
    sections: [
      { id: 'table',    label: 'Bookings Table (filters + search)',  h: 480, accent: true },
      { id: 'calendar', label: 'Monthly Calendar View',             h: 440 },
      { id: 'schedule', label: 'Schedule / Hours Editor',           h: 320 },
      { id: 'push',     label: 'Push Notifications Panel',          h: 200 },
    ],
  },
  faq: {
    name: 'FAQ',
    file: 'faq.html',
    sections: [
      { id: 'hero',    label: 'FAQ — Page Hero',                    h: 260, accent: true },
      { id: 'items',   label: 'FAQ Accordion (12 items)',            h: 600 },
      { id: 'footer',  label: 'Footer',                             h: 200, footer: true },
    ],
  },
  aftercare: {
    name: 'Aftercare',
    file: 'aftercare.html',
    sections: [
      { id: 'hero',     label: 'Aftercare — Hero',                  h: 260, accent: true },
      { id: 'timeline', label: 'Healing Timeline (tabs)',           h: 460 },
      { id: 'tips',     label: 'Do / Don\'t Tips Grid',             h: 340 },
      { id: 'footer',   label: 'Footer',                            h: 200, footer: true },
    ],
  },
  contacts: {
    name: 'Contacts',
    file: 'contacts.html',
    sections: [
      { id: 'hero',    label: 'Contacts — Hero',                    h: 240, accent: true },
      { id: 'map',     label: 'Yandex Map Embed',                   h: 420 },
      { id: 'form',    label: 'Contact Form + Social Links',        h: 380 },
      { id: 'footer',  label: 'Footer',                             h: 200, footer: true },
    ],
  },
};

var PAGE_ORDER = ['home','master','booking','cabinet','admin','faq','aftercare','contacts'];

// ─── Viewport config ─────────────────────────────────────────────────────────

var VIEWS = {
  desktop: { w: 1440, nav: 72,  name: 'Desktop 1440' },
  mobile:  { w: 375,  nav: 60,  name: 'Mobile 375'   },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function solid(color, opacity) {
  if (opacity === undefined) { opacity = 1; }
  var fill = { type: 'SOLID', color: color, opacity: opacity };
  return [fill];
}

function rect(parent, x, y, w, h, color, opacity) {
  var r = figma.createRectangle();
  r.x = x; r.y = y;
  r.resize(w, h);
  if (color) { r.fills = solid(color, opacity); } else { r.fills = []; }
  parent.appendChild(r);
  return r;
}

function hline(parent, x, y, w, color) {
  var ln = figma.createLine();
  ln.x = x; ln.y = y;
  ln.resize(w, 0);
  ln.strokes = solid(color || C.border);
  ln.strokeWeight = 1;
  parent.appendChild(ln);
  return ln;
}

// Loads fonts once; call before any createText.
var fontsLoaded = false;
async function loadFonts() {
  if (fontsLoaded) { return; }
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  fontsLoaded = true;
}

function text(parent, str, x, y, size, color, weight, maxW) {
  var t = figma.createText();
  t.fontName = { family: 'Inter', style: weight || 'Regular' };
  t.characters = str;
  t.fontSize = size || 12;
  t.fills = solid(color || C.text);
  if (maxW) {
    t.textAutoResize = 'HEIGHT';
    t.resize(maxW, t.height);
  }
  t.x = x; t.y = y;
  parent.appendChild(t);
  return t;
}

function badge(parent, label, x, y, w, h, bg, fg) {
  var g = figma.createFrame();
  g.name = 'badge';
  g.resize(w, h);
  g.x = x; g.y = y;
  g.fills = solid(bg || C.accent, 0.15);
  g.cornerRadius = 4;
  g.clipsContent = false;
  var t = figma.createText();
  t.fontName = { family: 'Inter', style: 'Medium' };
  t.characters = label;
  t.fontSize = 10;
  t.fills = solid(fg || C.accent);
  t.textAlignHorizontal = 'CENTER';
  t.textAlignVertical = 'CENTER';
  t.x = 0; t.y = 0;
  t.resize(w, h);
  g.appendChild(t);
  parent.appendChild(g);
  return g;
}

// ─── Nav bar ─────────────────────────────────────────────────────────────────

function buildNav(frame, vw, navH, isMobile) {
  var nav = figma.createFrame();
  nav.name = 'Nav';
  nav.resize(vw, navH);
  nav.x = 0; nav.y = 0;
  nav.fills = solid(C.bg, 0.95);

  var pad = isMobile ? 20 : 60;

  // Logo
  var logo = text(nav, 'REMNANT', pad, (navH - 14) / 2, 14, C.accent, 'Semi Bold');
  logo.letterSpacing = { value: 4, unit: 'PIXELS' };

  if (!isMobile) {
    // Nav links
    var links = ['MASTER', 'BOOKING', 'FAQ', 'AFTERCARE', 'CONTACTS'];
    var lx = vw / 2 - (links.length * 80) / 2;
    for (var i = 0; i < links.length; i++) {
      var lt = text(nav, links[i], lx + i * 90, (navH - 10) / 2, 10, C.muted, 'Medium');
      lt.letterSpacing = { value: 2, unit: 'PIXELS' };
    }
    // CTA button
    var btnW = 120; var btnH = 34;
    var btnX = vw - pad - btnW;
    var btnY = (navH - btnH) / 2;
    var btn = figma.createFrame();
    btn.name = 'CTA';
    btn.resize(btnW, btnH);
    btn.x = btnX; btn.y = btnY;
    btn.fills = solid(C.accent, 0.12);
    btn.cornerRadius = 2;
    var btnT = text(btn, 'ЗАПИСАТЬСЯ', 0, 0, 9, C.accent, 'Semi Bold');
    btnT.textAlignHorizontal = 'CENTER';
    btnT.textAlignVertical = 'CENTER';
    btnT.resize(btnW, btnH);
    btnT.x = 0; btnT.y = 0;
    btnT.letterSpacing = { value: 2, unit: 'PIXELS' };
    nav.appendChild(btn);
  } else {
    // Burger icon (3 lines)
    var bx = vw - pad - 20;
    var by = (navH - 12) / 2;
    for (var li = 0; li < 3; li++) {
      var line = figma.createLine();
      line.x = bx; line.y = by + li * 6;
      line.resize(20, 0);
      line.strokes = solid(C.text);
      line.strokeWeight = 1.5;
      nav.appendChild(line);
    }
  }

  // Bottom border
  hline(nav, 0, navH - 1, vw, C.border);

  frame.appendChild(nav);
}

// ─── Section builder ─────────────────────────────────────────────────────────

function buildSection(frame, section, vw, y, isMobile) {
  var pad = isMobile ? 20 : 80;
  var h = section.h;
  if (isMobile) { h = Math.round(h * 0.85); }

  var sec = figma.createFrame();
  sec.name = section.id;
  sec.resize(vw, h);
  sec.x = 0; sec.y = y;

  // Background
  if (section.accent) {
    sec.fills = solid(C.surface, 1);
    // subtle gradient overlay placeholder
    var glay = rect(sec, 0, 0, vw, h, C.accent, 0.03);
    glay.name = 'gradient-overlay';
  } else if (section.footer) {
    sec.fills = solid(C.bg, 1);
    hline(sec, 0, 0, vw, C.border);
  } else {
    sec.fills = solid(C.bg, 1);
  }

  // Section label
  var labelY = isMobile ? 20 : 28;
  var lbl = text(sec, section.label, pad, labelY, isMobile ? 11 : 13, C.muted, 'Regular', vw - pad * 2);
  lbl.letterSpacing = { value: 0.5, unit: 'PIXELS' };

  // Render section-specific wireframe content
  var contentY = labelY + (isMobile ? 32 : 42);
  buildSectionContent(sec, section, vw, h, contentY, pad, isMobile);

  frame.appendChild(sec);
  return h;
}

// ─── Per-section wireframe content ───────────────────────────────────────────

function buildSectionContent(sec, section, vw, h, cy, pad, isMobile) {
  var id = section.id;
  var inner = vw - pad * 2;
  var colGap = isMobile ? 12 : 24;
  var mid = vw / 2;

  if (id === 'hero') {
    if (section.label.indexOf('3D') !== -1 || section.label.indexOf('Artist') !== -1) {
      // Big headline placeholder
      var hl = rect(sec, pad, cy, isMobile ? inner : Math.round(inner * 0.55), isMobile ? 48 : 72, C.surface2);
      hl.cornerRadius = 2;
      var sub = rect(sec, pad, cy + (isMobile ? 56 : 84), isMobile ? inner * 0.7 : Math.round(inner * 0.38), isMobile ? 20 : 28, C.surface3);
      sub.cornerRadius = 2;
      // CTA buttons
      var btnRowY = cy + (isMobile ? 96 : 148);
      var btnRect = figma.createFrame();
      btnRect.name = 'cta-btn';
      btnRect.resize(isMobile ? 140 : 180, isMobile ? 40 : 48);
      btnRect.x = pad; btnRect.y = btnRowY;
      btnRect.fills = solid(C.accent, 1);
      btnRect.cornerRadius = 2;
      sec.appendChild(btnRect);
      var btnLbl = text(btnRect, 'ЗАПИСАТЬСЯ', 0, 0, isMobile ? 10 : 11, C.bg, 'Semi Bold');
      btnLbl.textAlignHorizontal = 'CENTER';
      btnLbl.textAlignVertical = 'CENTER';
      btnLbl.resize(btnRect.width, btnRect.height);
      btnLbl.letterSpacing = { value: 2, unit: 'PIXELS' };
      // Hero image placeholder (right side, desktop only)
      if (!isMobile) {
        var imgW = Math.round(inner * 0.38);
        var imgX = vw - pad - imgW;
        var imgH = h - cy - 40;
        var img = rect(sec, imgX, cy, imgW, imgH > 0 ? imgH : 200, C.surface2);
        img.cornerRadius = 4;
        text(sec, '[ 3D / Photo ]', imgX + imgW / 2 - 40, cy + (imgH > 0 ? imgH : 200) / 2 - 8, 11, C.muted, 'Regular');
      }
    }
  } else if (id === 'portfolio') {
    var cols = isMobile ? 2 : 3;
    var rows = 2;
    var cellW = Math.floor((inner - (cols - 1) * colGap) / cols);
    var cellH = isMobile ? 140 : 200;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var cx = pad + col * (cellW + colGap);
        var cellY = cy + row * (cellH + colGap);
        var cell = rect(sec, cx, cellY, cellW, cellH, C.surface2);
        cell.cornerRadius = 4;
        text(sec, '[ photo ]', cx + cellW / 2 - 22, cellY + cellH / 2 - 8, 10, C.muted);
      }
    }
  } else if (id === 'faq-prev' || id === 'items') {
    var faqCount = id === 'items' ? 5 : 3;
    var faqItemH = isMobile ? 48 : 52;
    for (var fi = 0; fi < faqCount; fi++) {
      var fy = cy + fi * (faqItemH + 8);
      var fitem = figma.createFrame();
      fitem.name = 'faq-item-' + fi;
      fitem.resize(inner, faqItemH);
      fitem.x = pad; fitem.y = fy;
      fitem.fills = solid(C.surface);
      fitem.cornerRadius = 4;
      sec.appendChild(fitem);
      // Question line
      var qw = Math.floor(inner * (0.5 + Math.random() * 0.25));
      rect(fitem, 16, (faqItemH - 12) / 2, qw - 16, 12, C.surface3);
      // Arrow
      var arr = text(fitem, fi === 0 ? '∧' : '∨', inner - 28, (faqItemH - 12) / 2, 12, C.muted);
    }
  } else if (id === 'testimonials') {
    var tCols = isMobile ? 1 : 3;
    var tW = Math.floor((inner - (tCols - 1) * colGap) / tCols);
    var tH = isMobile ? 120 : 180;
    for (var ti = 0; ti < tCols; ti++) {
      var tx = pad + ti * (tW + colGap);
      var tcard = figma.createFrame();
      tcard.name = 'testimonial-' + ti;
      tcard.resize(tW, tH);
      tcard.x = tx; tcard.y = cy;
      tcard.fills = solid(C.surface);
      tcard.cornerRadius = 4;
      sec.appendChild(tcard);
      // Stars
      text(tcard, '★★★★★', 16, 16, 10, C.accent);
      // Quote lines
      rect(tcard, 16, 38, tW - 32, 10, C.surface3);
      rect(tcard, 16, 52, Math.floor((tW - 32) * 0.75), 10, C.surface3);
      rect(tcard, 16, 66, Math.floor((tW - 32) * 0.55), 10, C.surface3);
      // Author
      rect(tcard, 16, tH - 28, 60, 8, C.accent, 0.4);
    }
  } else if (id === 'step1') {
    // Calendar grid
    var calW = isMobile ? inner : 360;
    var calH = isMobile ? 300 : 340;
    var calX = isMobile ? pad : mid - calW / 2;
    var cal = figma.createFrame();
    cal.name = 'calendar';
    cal.resize(calW, calH);
    cal.x = calX; cal.y = cy;
    cal.fills = solid(C.surface);
    cal.cornerRadius = 8;
    sec.appendChild(cal);
    // Month header
    rect(cal, calW / 2 - 60, 12, 120, 16, C.surface3);
    // Day labels
    var days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    var cellSz = Math.floor((calW - 32) / 7);
    for (var d = 0; d < 7; d++) {
      text(cal, days[d], 16 + d * cellSz + cellSz / 2 - 6, 42, 9, C.muted);
    }
    // Day cells
    for (var week = 0; week < 5; week++) {
      for (var day = 0; day < 7; day++) {
        var dcx = 16 + day * cellSz;
        var dcy = 64 + week * cellSz;
        var isActive = (week === 1 && day === 2);
        var isDisabled = (week === 0 && day < 2) || (week === 4 && day > 4);
        var dc = rect(cal, dcx, dcy, cellSz - 4, cellSz - 4, isActive ? C.accent : (isDisabled ? C.surface : C.surface2));
        dc.cornerRadius = 4;
      }
    }
  } else if (id === 'step2') {
    // Time slot grid
    var slots = ['12:00','14:00','16:00','18:00','20:00'];
    var slotW = isMobile ? 80 : 100;
    var slotH = isMobile ? 36 : 44;
    var slotGap = isMobile ? 8 : 12;
    for (var si = 0; si < slots.length; si++) {
      var sx = pad + si * (slotW + slotGap);
      var isBooked = si === 1;
      var isSelected = si === 3;
      if (sx + slotW > vw - pad) { break; }
      var sb = figma.createFrame();
      sb.name = 'slot-' + slots[si];
      sb.resize(slotW, slotH);
      sb.x = sx; sb.y = cy;
      sb.fills = solid(isSelected ? C.accent : (isBooked ? C.surface : C.surface2));
      sb.cornerRadius = 4;
      sec.appendChild(sb);
      var sc = text(sb, slots[si], 0, 0, isMobile ? 11 : 13,
        isSelected ? C.bg : (isBooked ? C.muted : C.text), 'Medium');
      sc.textAlignHorizontal = 'CENTER';
      sc.textAlignVertical = 'CENTER';
      sc.resize(slotW, slotH);
    }
    if (isBooked !== undefined) {
      badge(sec, '— занято', pad, cy + slotH + 12, 80, 20, C.border, C.muted);
    }
  } else if (id === 'step3' || id === 'form') {
    // Form fields
    var fieldNames = id === 'form'
      ? ['Имя','Email','Сообщение']
      : ['Имя','Телефон','Стиль тату','Размер / место','Описание идеи'];
    var fW = isMobile ? inner : Math.min(480, inner);
    var fX = isMobile ? pad : mid - fW / 2;
    var fY = cy;
    for (var fIdx = 0; fIdx < fieldNames.length; fIdx++) {
      var fH = (fIdx === fieldNames.length - 1) ? (isMobile ? 80 : 100) : (isMobile ? 40 : 48);
      text(sec, fieldNames[fIdx], fX, fY, 10, C.muted, 'Regular');
      var field = figma.createFrame();
      field.name = 'field-' + fIdx;
      field.resize(fW, fH);
      field.x = fX; field.y = fY + 16;
      field.fills = solid(C.surface);
      field.cornerRadius = 4;
      sec.appendChild(field);
      fY = fY + 16 + fH + 16;
    }
    // Submit button
    var sbW = isMobile ? inner : fW;
    var sbH = isMobile ? 44 : 52;
    var sbFrame = figma.createFrame();
    sbFrame.name = 'submit-btn';
    sbFrame.resize(sbW, sbH);
    sbFrame.x = fX; sbFrame.y = fY;
    sbFrame.fills = solid(C.accent);
    sbFrame.cornerRadius = 2;
    sec.appendChild(sbFrame);
    var sbT = text(sbFrame, id === 'form' ? 'ОТПРАВИТЬ' : 'ПОДТВЕРДИТЬ ЗАПИСЬ',
      0, 0, 11, C.bg, 'Semi Bold');
    sbT.textAlignHorizontal = 'CENTER';
    sbT.textAlignVertical = 'CENTER';
    sbT.resize(sbW, sbH);
    sbT.letterSpacing = { value: 2, unit: 'PIXELS' };
  } else if (id === 'login') {
    // Login card
    var loginW = isMobile ? inner : 360;
    var loginH = isMobile ? 280 : 320;
    var loginX = isMobile ? pad : mid - loginW / 2;
    var loginCard = figma.createFrame();
    loginCard.name = 'login-card';
    loginCard.resize(loginW, loginH);
    loginCard.x = loginX; loginCard.y = cy;
    loginCard.fills = solid(C.surface);
    loginCard.cornerRadius = 8;
    sec.appendChild(loginCard);
    // Title
    var ltitle = text(loginCard, 'ЛИЧНЫЙ КАБИНЕТ', 24, 28, 12, C.accent, 'Semi Bold');
    ltitle.letterSpacing = { value: 3, unit: 'PIXELS' };
    // Phone field
    rect(loginCard, 24, 68, loginW - 48, 44, C.surface2);
    text(loginCard, 'Телефон', 24, 54, 9, C.muted);
    // Pass field
    rect(loginCard, 24, 134, loginW - 48, 44, C.surface2);
    text(loginCard, 'Пароль', 24, 120, 9, C.muted);
    // Enter btn
    var enterBtn = figma.createFrame();
    enterBtn.name = 'enter-btn';
    enterBtn.resize(loginW - 48, 44);
    enterBtn.x = 24; enterBtn.y = 200;
    enterBtn.fills = solid(C.accent);
    enterBtn.cornerRadius = 2;
    loginCard.appendChild(enterBtn);
    var et = text(enterBtn, 'ВОЙТИ', 0, 0, 11, C.bg, 'Semi Bold');
    et.textAlignHorizontal = 'CENTER';
    et.textAlignVertical = 'CENTER';
    et.resize(loginW - 48, 44);
    et.letterSpacing = { value: 2, unit: 'PIXELS' };
  } else if (id === 'profile') {
    var pCard = figma.createFrame();
    pCard.name = 'profile-card';
    pCard.resize(inner, h - cy - 24);
    pCard.x = pad; pCard.y = cy;
    pCard.fills = solid(C.surface);
    pCard.cornerRadius = 8;
    sec.appendChild(pCard);
    var pInner = pCard.width;
    var pInH = pCard.height;
    // Avatar circle
    var avR = isMobile ? 24 : 32;
    var av = figma.createEllipse();
    av.resize(avR * 2, avR * 2);
    av.x = 24; av.y = (pInH - avR * 2) / 2;
    av.fills = solid(C.surface2);
    pCard.appendChild(av);
    // Name + phone lines
    rect(pCard, 24 + avR * 2 + 16, (pInH / 2) - 16, isMobile ? 120 : 160, 12, C.surface3);
    rect(pCard, 24 + avR * 2 + 16, (pInH / 2) + 4,  isMobile ? 80 : 110,  8, C.surface3);
  } else if (id === 'bookings') {
    var bRows = 3;
    var bRowH = isMobile ? 64 : 72;
    for (var bi = 0; bi < bRows; bi++) {
      var bCard = figma.createFrame();
      bCard.name = 'booking-row-' + bi;
      bCard.resize(inner, bRowH);
      bCard.x = pad; bCard.y = cy + bi * (bRowH + 10);
      bCard.fills = solid(C.surface);
      bCard.cornerRadius = 6;
      sec.appendChild(bCard);
      // Date pill
      badge(bCard, '15 июня', 16, (bRowH - 24) / 2, 64, 24, C.accent, C.accent);
      // Status
      var statuses = ['pending','confirmed','done'];
      var statColors = [C.muted, C.accent, C.muted];
      var statLabels = ['Ожидает','Подтверждено','Выполнено'];
      badge(bCard, statLabels[bi], bCard.width - 110, (bRowH - 24) / 2, 90, 24,
        bi === 1 ? C.accent : C.surface2, statColors[bi]);
      // Detail lines
      rect(bCard, 96, 16, isMobile ? 100 : 140, 10, C.surface3);
      rect(bCard, 96, 32, isMobile ? 70 : 100, 8, C.surface3);
    }
  } else if (id === 'notif') {
    var nItems = 3;
    var nH = isMobile ? 52 : 60;
    for (var ni = 0; ni < nItems; ni++) {
      var nRow = figma.createFrame();
      nRow.name = 'notif-' + ni;
      nRow.resize(inner, nH);
      nRow.x = pad; nRow.y = cy + ni * (nH + 8);
      nRow.fills = solid(C.surface);
      nRow.cornerRadius = 6;
      sec.appendChild(nRow);
      // Dot
      var dot = figma.createEllipse();
      dot.resize(8, 8);
      dot.x = 14; dot.y = (nH - 8) / 2;
      dot.fills = solid(ni === 0 ? C.accent : C.muted);
      nRow.appendChild(dot);
      // Text lines
      rect(nRow, 34, 16, isMobile ? 180 : 260, 10, C.surface3);
      rect(nRow, 34, 30, isMobile ? 80 : 120, 8, C.surface3);
    }
  } else if (id === 'table') {
    // Admin bookings table
    var cols = isMobile ? 3 : 6;
    var colW = Math.floor((inner - (cols - 1) * 8) / cols);
    var tableH = Math.min(h - cy - 40, isMobile ? 260 : 340);
    var tbl = figma.createFrame();
    tbl.name = 'bookings-table';
    tbl.resize(inner, tableH);
    tbl.x = pad; tbl.y = cy;
    tbl.fills = solid(C.surface);
    tbl.cornerRadius = 6;
    tbl.clipsContent = true;
    sec.appendChild(tbl);
    // Header row
    rect(tbl, 0, 0, inner, isMobile ? 36 : 44, C.surface2);
    var headers = isMobile ? ['Дата','Клиент','Статус'] : ['Дата','Время','Клиент','Телефон','Стиль','Статус'];
    for (var hc = 0; hc < cols; hc++) {
      text(tbl, headers[hc], 12 + hc * (colW + 8), isMobile ? 14 : 17, 9, C.muted, 'Medium');
    }
    // Data rows
    var rowH = isMobile ? 40 : 48;
    var rowCount = Math.floor((tableH - (isMobile ? 36 : 44)) / (rowH + 1));
    for (var ri = 0; ri < rowCount; ri++) {
      var ry = (isMobile ? 36 : 44) + ri * (rowH + 1);
      hline(tbl, 0, ry, inner, C.border);
      for (var rc = 0; rc < cols; rc++) {
        var isStatus = (rc === cols - 1);
        var cellX = 12 + rc * (colW + 8);
        if (isStatus) {
          badge(tbl, ri % 2 === 0 ? 'Подтверждено' : 'Ожидает',
            cellX, ry + (rowH - 22) / 2, Math.min(colW, 100), 22,
            ri % 2 === 0 ? C.accent : C.surface3,
            ri % 2 === 0 ? C.bg : C.muted);
        } else {
          rect(tbl, cellX, ry + (rowH - 10) / 2,
            Math.floor(colW * (0.5 + (rc * 0.1 % 0.4))), 10, C.surface3);
        }
      }
    }
    // Search/filter bar above table
    var barY = cy - (isMobile ? 44 : 52);
    if (barY > 0) {
      var searchW = isMobile ? inner * 0.6 : inner * 0.35;
      var searchBar = figma.createFrame();
      searchBar.name = 'search';
      searchBar.resize(Math.floor(searchW), isMobile ? 36 : 40);
      searchBar.x = pad; searchBar.y = barY;
      searchBar.fills = solid(C.surface);
      searchBar.cornerRadius = 4;
      sec.appendChild(searchBar);
      text(searchBar, '🔍  Поиск…', 12, isMobile ? 12 : 14, 11, C.muted);
      if (!isMobile) {
        // Filter chips
        var filterLabels = ['Все', 'Ожидает', 'Подтверждено'];
        var fChipX = pad + Math.floor(searchW) + 16;
        for (var fc = 0; fc < filterLabels.length; fc++) {
          badge(sec, filterLabels[fc], fChipX + fc * 106, barY + 6, 90, 28,
            fc === 0 ? C.accent : C.surface, fc === 0 ? C.bg : C.muted);
        }
      }
    }
  } else if (id === 'calendar') {
    // Monthly calendar
    var mcW = isMobile ? inner : Math.min(600, inner);
    var mcH = isMobile ? 300 : 380;
    var mcX = isMobile ? pad : mid - mcW / 2;
    var mc = figma.createFrame();
    mc.name = 'month-calendar';
    mc.resize(mcW, mcH);
    mc.x = mcX; mc.y = cy;
    mc.fills = solid(C.surface);
    mc.cornerRadius = 8;
    sec.appendChild(mc);
    // Header
    rect(mc, mcW / 2 - 70, 14, 140, 16, C.surface3);
    // Navigation arrows
    text(mc, '‹', 16, 12, 18, C.muted);
    text(mc, '›', mcW - 28, 12, 18, C.muted);
    // Day grid
    var mcCellW = Math.floor((mcW - 32) / 7);
    var mcDays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    for (var mcd = 0; mcd < 7; mcd++) {
      text(mc, mcDays[mcd], 16 + mcd * mcCellW + mcCellW / 2 - 6, 44, 9, C.muted);
    }
    for (var mcW2 = 0; mcW2 < 5; mcW2++) {
      for (var mcd2 = 0; mcd2 < 7; mcd2++) {
        var mcCX = 16 + mcd2 * mcCellW;
        var mcCY = 64 + mcW2 * mcCellW;
        var isEvent = ((mcW2 === 1 && mcd2 === 3) || (mcW2 === 2 && mcd2 === 1));
        var mcCell = rect(mc, mcCX, mcCY, mcCellW - 4, mcCellW - 4,
          isEvent ? C.accent : C.surface2);
        mcCell.cornerRadius = 4;
        if (isEvent) {
          text(mc, '●', mcCX + mcCellW / 2 - 4, mcCY + mcCellW / 2 - 8, 8, C.bg);
        }
      }
    }
  } else if (id === 'schedule') {
    // Schedule editor rows
    var schedDays = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
    var sRowH = isMobile ? 40 : 48;
    for (var sd = 0; sd < schedDays.length; sd++) {
      var sRow = figma.createFrame();
      sRow.name = 'sched-' + schedDays[sd];
      sRow.resize(inner, sRowH);
      sRow.x = pad; sRow.y = cy + sd * (sRowH + 8);
      sRow.fills = solid(C.surface);
      sRow.cornerRadius = 4;
      sec.appendChild(sRow);
      // Day name
      text(sRow, schedDays[sd], 16, (sRowH - 10) / 2, isMobile ? 10 : 11, C.text);
      // Toggle
      var togW = 40; var togH = 22;
      var togX = sRow.width - togW - 16;
      var togY = (sRowH - togH) / 2;
      var tog = figma.createFrame();
      tog.name = 'toggle';
      tog.resize(togW, togH);
      tog.x = togX; tog.y = togY;
      tog.fills = solid(sd < 5 ? C.accent : C.surface2);
      tog.cornerRadius = togH / 2;
      sRow.appendChild(tog);
      // Time range (if active)
      if (sd < 5 && !isMobile) {
        rect(sRow, isMobile ? 120 : 160, (sRowH - 28) / 2, 80, 28, C.surface2);
        rect(sRow, isMobile ? 252 : 260, (sRowH - 28) / 2, 80, 28, C.surface2);
        text(sRow, '—', isMobile ? 244 : 250, (sRowH - 10) / 2, 10, C.muted);
      }
    }
  } else if (id === 'map') {
    // Map placeholder
    var mapH = h - cy - 24;
    var mapEl = rect(sec, pad, cy, inner, mapH > 0 ? mapH : 300, C.surface2);
    mapEl.cornerRadius = 6;
    text(sec, '[ Yandex Maps Embed ]', mid - 80, cy + (mapH > 0 ? mapH : 300) / 2 - 8, 12, C.muted);
    // Pin
    var pinEl = figma.createEllipse();
    pinEl.resize(16, 16);
    pinEl.x = mid - 8; pinEl.y = cy + (mapH > 0 ? mapH : 300) / 2 - 30;
    pinEl.fills = solid(C.accent);
    sec.appendChild(pinEl);
  } else if (id === 'push') {
    // Push subscriptions list
    var pW = isMobile ? inner : Math.min(500, inner);
    var pX = isMobile ? pad : mid - pW / 2;
    for (var pi = 0; pi < 3; pi++) {
      var pRow = figma.createFrame();
      pRow.name = 'push-sub-' + pi;
      pRow.resize(pW, 48);
      pRow.x = pX; pRow.y = cy + pi * 58;
      pRow.fills = solid(C.surface);
      pRow.cornerRadius = 4;
      sec.appendChild(pRow);
      text(pRow, 'Browser ' + (pi + 1), 16, 18, 11, C.muted);
      rect(pRow, Math.floor(pW * 0.35), 20, Math.floor(pW * 0.35), 10, C.surface3);
    }
    var sendBtn = figma.createFrame();
    sendBtn.name = 'send-push-btn';
    sendBtn.resize(isMobile ? inner : 200, 40);
    sendBtn.x = isMobile ? pad : mid - 100; sendBtn.y = cy + 3 * 58 + 8;
    sendBtn.fills = solid(C.accent, 0.15);
    sendBtn.cornerRadius = 2;
    sec.appendChild(sendBtn);
    var sbt = text(sendBtn, 'ОТПРАВИТЬ ПУШИ', 0, 0, 10, C.accent, 'Semi Bold');
    sbt.textAlignHorizontal = 'CENTER';
    sbt.textAlignVertical = 'CENTER';
    sbt.resize(sendBtn.width, 40);
    sbt.letterSpacing = { value: 2, unit: 'PIXELS' };
  } else if (id === 'timeline') {
    // Tab bar + content
    var tabLabels = ['День 1–3', 'День 4–7', 'Неделя 2', 'Месяц 1'];
    var tabW = Math.floor(inner / tabLabels.length);
    var tabH = isMobile ? 36 : 44;
    for (var ti2 = 0; ti2 < tabLabels.length; ti2++) {
      var tTab = figma.createFrame();
      tTab.name = 'tab-' + ti2;
      tTab.resize(tabW - 4, tabH);
      tTab.x = pad + ti2 * tabW; tTab.y = cy;
      tTab.fills = solid(ti2 === 0 ? C.accent : C.surface);
      tTab.cornerRadius = 4;
      sec.appendChild(tTab);
      var ttT = text(tTab, tabLabels[ti2], 0, 0, 10, ti2 === 0 ? C.bg : C.muted, 'Medium');
      ttT.textAlignHorizontal = 'CENTER';
      ttT.textAlignVertical = 'CENTER';
      ttT.resize(tabW - 4, tabH);
    }
    // Content lines below tabs
    var tlineY = cy + tabH + 20;
    for (var tl = 0; tl < 4; tl++) {
      rect(sec, pad + 8, tlineY + tl * 20, Math.floor(inner * (0.4 + tl * 0.1 % 0.5)), 10, C.surface3);
    }
  } else if (id === 'bio') {
    // Two-column layout
    var colW2 = isMobile ? inner : Math.floor((inner - colGap) / 2);
    // Left: text lines
    for (var bl = 0; bl < 5; bl++) {
      rect(sec, pad, cy + bl * 22, Math.floor(colW2 * (0.7 + bl * 0.07 % 0.3)), 12, C.surface3);
    }
    if (!isMobile) {
      // Right: image
      var biImg = rect(sec, pad + colW2 + colGap, cy, colW2, 200, C.surface2);
      biImg.cornerRadius = 4;
      text(sec, '[ Studio / Process ]', pad + colW2 + colGap + colW2 / 2 - 70, cy + 96, 11, C.muted);
    }
  } else if (id === 'about') {
    // Text block + stats
    var stW = isMobile ? inner : Math.floor(inner * 0.55);
    for (var al = 0; al < 4; al++) {
      rect(sec, pad, cy + al * 22, Math.floor(stW * (0.8 - al * 0.05)), 12, C.surface3);
    }
    // Stats row
    var statItems = ['200+', '5 лет', 'Fine Line'];
    var statW = isMobile ? Math.floor(inner / 3) - 8 : 140;
    var statY = cy + (isMobile ? 100 : 80);
    for (var asi = 0; asi < statItems.length; asi++) {
      var statX = pad + asi * (statW + (isMobile ? 8 : colGap));
      var sCard = figma.createFrame();
      sCard.name = 'stat-' + asi;
      sCard.resize(statW, isMobile ? 64 : 80);
      sCard.x = statX; sCard.y = statY;
      sCard.fills = solid(C.surface);
      sCard.cornerRadius = 4;
      sec.appendChild(sCard);
      text(sCard, statItems[asi], 0, 12, isMobile ? 16 : 22, C.accent, 'Semi Bold');
    }
  } else if (id === 'footer') {
    // Footer layout
    var fCols = isMobile ? 1 : 3;
    var fColW = Math.floor(inner / fCols);
    var colTitles = ['REMNANT', 'НАВИГАЦИЯ', 'КОНТАКТЫ'];
    for (var fci = 0; fci < fCols; fci++) {
      var fcX = pad + fci * fColW;
      var fcY = cy;
      text(sec, colTitles[fci], fcX, fcY, isMobile ? 11 : 12, fci === 0 ? C.accent : C.muted, 'Semi Bold');
      for (var fli = 0; fli < 3; fli++) {
        rect(sec, fcX, fcY + 22 + fli * 18, Math.floor(fColW * 0.55), 8, C.surface3);
      }
    }
    hline(sec, pad, h - 40, inner, C.border);
    text(sec, '© 2024 REMNANT Tattoo Studio · Москва', pad, h - 26, 10, C.muted);
  }
}

// ─── Main frame builder ──────────────────────────────────────────────────────

async function buildPageFrame(pageId, viewport, xOffset) {
  var def = PAGE_DEFS[pageId];
  if (!def) { return null; }

  var vw = viewport.w;
  var navH = viewport.nav;
  var isMobile = (vw < 400);

  var frame = figma.createFrame();
  frame.name = def.name + ' · ' + def.file + ' · ' + viewport.name;
  frame.x = xOffset;
  frame.y = 0;
  frame.fills = solid(C.bg);
  // Set initial size — will resize after content
  frame.resize(vw, 900);

  // Nav
  buildNav(frame, vw, navH, isMobile);

  // Sections
  var totalH = navH;
  for (var i = 0; i < def.sections.length; i++) {
    var sec = def.sections[i];
    var secH = buildSection(frame, sec, vw, totalH, isMobile);
    totalH += secH;
  }

  // Final resize
  frame.resize(vw, totalH);

  figma.currentPage.appendChild(frame);
  return frame;
}

// ─── Plugin entry point ──────────────────────────────────────────────────────

figma.showUI(__html__, { width: 300, height: 560 });

figma.ui.onmessage = async function(msg) {
  if (msg.type !== 'generate') { return; }

  try {
    await loadFonts();

    var requestedIds = msg.pages || PAGE_ORDER;
    var viewport = VIEWS[msg.view] || VIEWS.desktop;

    // Build only valid ordered ids
    var toGenerate = PAGE_ORDER.filter(function(id) {
      return requestedIds.indexOf(id) !== -1;
    });

    var GAP = 80;
    var xCursor = 0;
    var created = 0;

    for (var i = 0; i < toGenerate.length; i++) {
      var pageId = toGenerate[i];
      figma.ui.postMessage({ type: 'progress', text: 'Building ' + (PAGE_DEFS[pageId] ? PAGE_DEFS[pageId].name : pageId) + '…' });

      var frame = await buildPageFrame(pageId, viewport, xCursor);
      if (frame) {
        xCursor += frame.width + GAP;
        created++;
      }
    }

    // Zoom to fit all created frames
    figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);

    figma.ui.postMessage({ type: 'done', count: created });

  } catch (err) {
    figma.ui.postMessage({ type: 'error', text: String(err) });
  }
};

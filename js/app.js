/* Forja de Skins: editor, prévia 3D e acervo */
(() => {
  'use strict';
  const A = window.SkinArt;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const KEY_DRAFT = 'forja:rascunho', KEY_MINE = 'forja:minhas', KEY_RECENT = 'forja:recentes';

  const hexToRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'skin';
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  let toastT = 0;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
  }

  const ICONS = {
    orbit: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    eraser: '<path d="M8 20h12"/><path d="M4.5 14.5l9-9 6 6-7 7H9z"/><path d="M9.5 9.5l6 6"/>',
    fill: '<path d="M4 12l7-7 7 7-7 7z"/><path d="M4 12h14"/><path d="M20.5 15s1.5 2 1.5 3.2a1.5 1.5 0 0 1-3 0c0-1.2 1.5-3.2 1.5-3.2z"/>',
    picker: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L17 9l-3-3z"/><path d="M15 7L5 17v3h3L18 10"/>',
    lighten: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    darken: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    noise: '<path d="M5 5h.01M12 5h.01M19 5h.01M8.5 9.5h.01M15.5 9.5h.01M5 14h.01M12 14h.01M19 14h.01M8.5 18.5h.01M15.5 18.5h.01" stroke-width="3.2"/>',
    mirror: '<path d="M12 3v18" stroke-dasharray="2 3"/><path d="M9 7L4 17h5z"/><path d="M15 7l5 10h-5z"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  const TOOLS = [
    { id: 'orbit', label: 'Girar', key: 'h', tip: 'Girar a câmera sem pintar' },
    { id: 'pencil', label: 'Lápis', key: 'b', tip: 'Pinta um pixel' },
    { id: 'eraser', label: 'Borracha', key: 'e', tip: 'Deixa o pixel transparente' },
    { id: 'fill', label: 'Balde', key: 'g', tip: 'Preenche a área da mesma cor na face. Shift: troca essa cor na skin inteira' },
    { id: 'picker', label: 'Conta-gotas', key: 'i', tip: 'Copia a cor de um pixel (ou Alt + clique)' },
    { id: 'lighten', label: 'Clarear', key: 'l', tip: 'Clareia o pixel um pouco' },
    { id: 'darken', label: 'Escurecer', key: 'k', tip: 'Escurece o pixel um pouco' },
    { id: 'noise', label: 'Ruído', key: 'n', tip: 'Pinta com pequenas variações de brilho, como nas texturas do jogo' },
  ];
  const PAINT_TOOLS = ['pencil', 'eraser', 'fill', 'lighten', 'darken', 'noise'];

  const PALETTES = [
    ['Heráldica', [['Goles', '#B3261E'], ['Blau', '#2456A6'], ['Sinople', '#2E7D32'], ['Púrpura', '#6A2C8C'], ['Sable', '#1B1B1F'], ['Ouro', '#E0B13A'], ['Prata', '#E8EAEE']]],
    ['Metal e couro', [['Ferro', '#B9C0C8'], ['Aço', '#737B84'], ['Aço escuro', '#2E3038'], ['Latão', '#C9963A'], ['Couro', '#7A5230'], ['Couro escuro', '#4A3020'], ['Madeira', '#A8743A']]],
    ['Tecidos', [['Linho', '#E3D9C2'], ['Lã crua', '#8A6A48'], ['Vinho', '#7A1F3A'], ['Musgo', '#4E7A35'], ['Anil', '#25327A'], ['Carmim', '#9E1B2A'], ['Ocre', '#C9A66B']]],
    ['Peles', [['Pele 1', '#F3D2B8'], ['Pele 2', '#EDBB94'], ['Pele 3', '#D39A6A'], ['Pele 4', '#B57C55'], ['Pele 5', '#8A5A3C'], ['Pele 6', '#5E3B28']]],
    ['Cabelos', [['Loiro', '#E8C46A'], ['Ruivo', '#B5481E'], ['Castanho', '#6B4A2E'], ['Escuro', '#2B1A12'], ['Preto', '#1A1A1F'], ['Grisalho', '#D8D8D0']]],
  ];

  /* ---------- the texture being edited ---------- */
  const tex = document.createElement('canvas'); tex.width = tex.height = 64;
  const tctx = tex.getContext('2d', { willReadFrequently: true });
  let px = new Uint8ClampedArray(16384);
  const doc = { name: '', slim: false, savedId: null };
  const maps = {};
  const tmap = () => maps[doc.slim] || (maps[doc.slim] = A.texelMap(doc.slim));

  let tool = 'pencil', lastPaintTool = 'pencil', mirror = false, color = '#B3261E';
  let showOverlay = true, paintLayer = 'b', gridOn = true;
  let recent = store.get(KEY_RECENT, []);
  if (!Array.isArray(recent)) recent = [];

  /* ---------- history ---------- */
  const undoStack = [], redoStack = [];
  const snap = () => ({ px: px.slice(), slim: doc.slim, name: doc.name, savedId: doc.savedId });
  function pushUndo() { undoStack.push(snap()); if (undoStack.length > 100) undoStack.shift(); redoStack.length = 0; syncHistory(); }
  function restore(s) { px = s.px.slice(); doc.name = s.name; doc.savedId = s.savedId; $('#skinName').value = s.name; applySlim(s.slim); changed(); }
  function undo() { if (!undoStack.length) return; redoStack.push(snap()); restore(undoStack.pop()); syncHistory(); }
  function redo() { if (!redoStack.length) return; undoStack.push(snap()); restore(redoStack.pop()); syncHistory(); }
  function syncHistory() { $('#undoBtn').disabled = !undoStack.length; $('#redoBtn').disabled = !redoStack.length; }

  /* ---------- refresh pipeline ---------- */
  let raf = 0, dirty3d = false, draftT = 0;
  function changed() {
    tctx.putImageData(new ImageData(px, 64, 64), 0, 0);
    dirty3d = true;
    if (!raf) raf = requestAnimationFrame(flush);
    clearTimeout(draftT); draftT = setTimeout(saveDraft, 600);
  }
  function flush() {
    raf = 0;
    if (dirty3d && viewer) { viewer.loadSkin(tex, { model: doc.slim ? 'slim' : 'default' }); applyOverlayVisibility(); }
    dirty3d = false;
    draw2D();
  }
  function saveDraft() { store.set(KEY_DRAFT, { name: doc.name, slim: doc.slim, savedId: doc.savedId, png: tex.toDataURL('image/png') }); }

  /* ---------- painting ---------- */
  function mirrorOf(x, y) {
    const t = tmap()[y * 64 + x]; if (!t) return null;
    const mf = t.f === 'right' ? 'left' : t.f === 'left' ? 'right' : t.f;
    const r = A.partRects(A.MIRROR[t.p], t.layer, doc.slim)[mf];
    return [r[0] + (t.w - 1 - t.x), r[1] + t.y];
  }
  function targets(x, y) {
    const out = [[x, y]];
    if (mirror) { const m = mirrorOf(x, y); if (m && (m[0] !== x || m[1] !== y)) out.push(m); }
    return out;
  }
  function paintTexel(x, y, s) {
    const k = y * 64 + x; if (!tmap()[k]) return;
    const i = k * 4;
    if (s.tool === 'pencil') { px[i] = s.rgb[0]; px[i + 1] = s.rgb[1]; px[i + 2] = s.rgb[2]; px[i + 3] = 255; return; }
    if (s.tool === 'eraser') { px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0; return; }
    if (s.seen.has(k)) return; s.seen.add(k);
    if (s.tool === 'noise') {
      const f = 1 + (Math.random() * 2 - 1) * .09;
      px[i] = s.rgb[0] * f; px[i + 1] = s.rgb[1] * f; px[i + 2] = s.rgb[2] * f; px[i + 3] = 255; return;
    }
    if (!px[i + 3]) return;
    const amt = s.tool === 'lighten' ? .12 : -.12;
    for (let c = 0; c < 3; c++) px[i + c] = amt > 0 ? px[i + c] + (255 - px[i + c]) * amt : px[i + c] * (1 + amt);
  }
  function fillAt(x, y, everywhere) {
    const rgb = hexToRgb(color), M = tmap();
    for (const [sx, sy] of targets(x, y)) {
      const t0 = M[sy * 64 + sx]; if (!t0) continue;
      const si = (sy * 64 + sx) * 4, from = [px[si], px[si + 1], px[si + 2], px[si + 3]];
      if (from[3] === 255 && from[0] === rgb[0] && from[1] === rgb[1] && from[2] === rgb[2]) continue;
      const same = j => px[j] === from[0] && px[j + 1] === from[1] && px[j + 2] === from[2] && px[j + 3] === from[3];
      const put = j => { px[j] = rgb[0]; px[j + 1] = rgb[1]; px[j + 2] = rgb[2]; px[j + 3] = 255; };
      if (everywhere) { for (let k = 0; k < 4096; k++) if (M[k] && same(k * 4)) put(k * 4); continue; }
      const stack = [sy * 64 + sx], seen = new Uint8Array(4096);
      while (stack.length) {
        const k = stack.pop(); if (seen[k]) continue; seen[k] = 1;
        const t = M[k];
        if (!t || t.p !== t0.p || t.layer !== t0.layer || t.f !== t0.f || !same(k * 4)) continue;
        put(k * 4);
        const cx = k % 64, cy = k >> 6;
        if (cx > 0) stack.push(k - 1); if (cx < 63) stack.push(k + 1);
        if (cy > 0) stack.push(k - 64); if (cy < 63) stack.push(k + 64);
      }
    }
  }
  function pickAt(x, y) {
    const i = (y * 64 + x) * 4;
    if (!px[i + 3]) { toast('Esse pixel está transparente; não há cor para copiar.'); return; }
    setColor(rgbToHex(px[i], px[i + 1], px[i + 2]));
    if (tool === 'picker') setTool(lastPaintTool);
  }

  /* returns an active stroke, or null when the action finished in one click */
  function beginStroke(x, y, e) {
    if (tool === 'picker' || e.altKey) { pickAt(x, y); return null; }
    if (!tmap()[y * 64 + x]) return null;
    pushUndo();
    if (tool === 'fill') { fillAt(x, y, e.shiftKey); addRecent(color); changed(); return null; }
    const s = { tool, rgb: hexToRgb(color), seen: new Set(), last: [x, y] };
    for (const [tx, ty] of targets(x, y)) paintTexel(tx, ty, s);
    if (tool === 'pencil' || tool === 'noise') addRecent(color);
    changed();
    return s;
  }
  function continueStroke(s, x, y, joinLine) {
    let [x0, y0] = joinLine ? s.last : [x, y];
    const dx = Math.abs(x - x0), dy = -Math.abs(y - y0), sx = x0 < x ? 1 : -1, sy = y0 < y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (const [tx, ty] of targets(x0, y0)) paintTexel(tx, ty, s);
      if (x0 === x && y0 === y) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    s.last = [x, y];
    changed();
  }

  /* ---------- colours ---------- */
  function setColor(hex) {
    color = hex.toLowerCase();
    $('#colorIn').value = color;
    $('#hexIn').value = color.toUpperCase();
    $$('.slot[data-color]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === color)));
  }
  function addRecent(hex) {
    hex = hex.toLowerCase();
    recent = [hex, ...recent.filter(c => c !== hex)].slice(0, 9);
    store.set(KEY_RECENT, recent); renderHotbar();
  }
  function renderHotbar() {
    const hb = $('#hotbar'); hb.innerHTML = '';
    for (let n = 0; n < 9; n++) {
      const c = recent[n];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'slot' + (c ? '' : ' empty');
      b.innerHTML = `<i${c ? ` style="background:${c}"` : ''}></i><span class="num">${n + 1}</span>`;
      if (c) { b.dataset.color = c; b.title = c.toUpperCase(); b.setAttribute('aria-label', `Cor recente ${n + 1}: ${c.toUpperCase()}`); b.setAttribute('aria-pressed', String(c === color)); b.onclick = () => setColor(c); }
      else { b.disabled = true; b.setAttribute('aria-label', `Espaço ${n + 1} vazio`); }
      hb.appendChild(b);
    }
  }
  function renderPalettes() {
    const box = $('#palettes');
    for (const [title, list] of PALETTES) {
      const g = document.createElement('div'); g.className = 'pal-group';
      g.innerHTML = `<span class="lbl">${title}</span><div class="pal-row"></div>`;
      const row = g.lastChild;
      for (const [name, hex] of list) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'slot'; b.dataset.color = hex.toLowerCase(); b.title = `${name} ${hex}`;
        b.setAttribute('aria-label', `${name}, ${hex}`); b.setAttribute('aria-pressed', 'false');
        b.innerHTML = `<i style="background:${hex}"></i>`;
        b.onclick = () => setColor(hex);
        row.appendChild(b);
      }
      box.appendChild(g);
    }
  }

  /* ---------- tools ---------- */
  function renderRail() {
    const rail = $('#rail');
    for (const t of TOOLS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool'; b.dataset.tool = t.id; b.title = `${t.tip} (${t.key.toUpperCase()})`;
      b.setAttribute('aria-pressed', String(t.id === tool));
      b.innerHTML = `${svg(t.id)}<span>${t.label}</span><kbd>${t.key.toUpperCase()}</kbd>`;
      b.onclick = () => setTool(t.id);
      rail.appendChild(b);
    }
    rail.insertAdjacentHTML('beforeend', '<div class="rail-sep" role="separator"></div>');
    const m = document.createElement('button');
    m.type = 'button'; m.className = 'tool'; m.id = 'mirrorBtn'; m.title = 'Espelha a pintura entre os lados esquerdo e direito (M)';
    m.setAttribute('aria-pressed', 'false');
    m.innerHTML = `${svg('mirror')}<span>Simetria</span><kbd>M</kbd>`;
    m.onclick = () => setMirror(!mirror);
    rail.appendChild(m);
  }
  function setTool(id) {
    tool = id; if (PAINT_TOOLS.includes(id)) lastPaintTool = id;
    $$('.tool[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === id)));
    updateHint();
  }
  function setMirror(on) { mirror = on; $('#mirrorBtn').setAttribute('aria-pressed', String(on)); }
  function updateHint() {
    const h = $('#stageHint');
    h.textContent = tool === 'orbit' ? 'Arraste para girar · role para aproximar'
      : tool === 'picker' ? 'Clique no boneco para copiar uma cor'
      : 'Clique no boneco para pintar · arraste o fundo para girar';
  }

  /* ---------- model + layers ---------- */
  function applySlim(v) {
    doc.slim = v;
    $('#mClassic').setAttribute('aria-pressed', String(!v));
    $('#mSlim').setAttribute('aria-pressed', String(v));
    fgKey = ''; bgKey = '';
  }
  function setSlim(v) { if (v === doc.slim) return; pushUndo(); applySlim(v); changed(); }
  function applyOverlayVisibility() {
    if (!viewer) return;
    const sk = viewer.playerObject.skin;
    for (const p of ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']) sk[p].outerLayer.visible = showOverlay;
  }
  function setOverlay(on) {
    showOverlay = on; $('#ovToggle').setAttribute('aria-pressed', String(on));
    $('#layerO').disabled = !on;
    if (!on) setPaintLayer('b');
    applyOverlayVisibility();
  }
  function setPaintLayer(l) {
    paintLayer = l;
    $('#layerB').setAttribute('aria-pressed', String(l === 'b'));
    $('#layerO').setAttribute('aria-pressed', String(l === 'o'));
  }

  /* ---------- 3D viewer ---------- */
  let viewer = null;
  const stage = $('#stage'), view = $('#view');
  function init3D() {
    if (!window.skinview3d) { $('#stageFallback').hidden = false; return; }
    try {
      viewer = new skinview3d.SkinViewer({ canvas: view, width: stage.clientWidth, height: stage.clientHeight, zoom: .82, fov: 40 });
    } catch (e) { viewer = null; $('#stageFallback').hidden = false; return; }
    viewer.loadSkin(tex, { model: doc.slim ? 'slim' : 'default' });
    applyOverlayVisibility();
    setView(20);
    new ResizeObserver(() => viewer.setSize(stage.clientWidth, stage.clientHeight)).observe(stage);
    new IntersectionObserver(es => { viewer.renderPaused = !es[0].isIntersecting; }).observe(stage);
  }
  function setView(deg) {
    if (!viewer) return;
    const cam = viewer.camera, d = cam.position.length(), a = deg * Math.PI / 180;
    cam.position.set(Math.sin(a) * d * .985, d * .17, Math.cos(a) * d * .985);
    viewer.controls.update();
  }
  function setAnim(v) {
    if (!viewer) return;
    const S = window.skinview3d;
    viewer.animation = v === 'respirando' ? new S.IdleAnimation() : v === 'andando' ? new S.WalkingAnimation()
      : v === 'correndo' ? new S.RunningAnimation() : v === 'acenando' ? new S.WaveAnimation() : null;
    if (!viewer.animation) {
      const sk = viewer.playerObject.skin;
      for (const p of ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']) sk[p].rotation.set(0, 0, 0);
      viewer.playerObject.position.set(0, 0, 0); viewer.playerObject.rotation.set(0, 0, 0);
    }
  }

  /* Ray-pick the model: every body part is an axis-aligned box in its mesh space, so a slab
     test against the geometry's bounds finds the face, and that face's UVs give the texel. */
  const PART3D = ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg'];
  const visibleChain = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  function hit3D(e, layer) {
    if (!viewer) return null;
    const rect = view.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width * 2 - 1, ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const cam = viewer.camera; cam.updateMatrixWorld();
    const V3 = cam.position.constructor;
    const origin = new V3().setFromMatrixPosition(cam.matrixWorld);
    const dir = new V3(nx, ny, .5).unproject(cam).sub(origin).normalize();
    const skin = viewer.playerObject.skin;
    let best = null;
    for (const name of PART3D) {
      const m = layer === 'o' ? skin[name].outerLayer : skin[name].innerLayer;
      if (!visibleChain(m)) continue;
      m.updateWorldMatrix(true, false);
      const inv = m.matrixWorld.clone().invert();
      const o = origin.clone().applyMatrix4(inv), d = origin.clone().add(dir).applyMatrix4(inv).sub(o);
      const geo = m.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox, lo = [bb.min.x, bb.min.y, bb.min.z], hi = [bb.max.x, bb.max.y, bb.max.z];
      const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z];
      let tmin = -Infinity, tmax = Infinity, axis = -1, sign = 0, ok = true;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(D[a]) < 1e-12) { if (O[a] < lo[a] || O[a] > hi[a]) { ok = false; break; } continue; }
        let t1 = (lo[a] - O[a]) / D[a], t2 = (hi[a] - O[a]) / D[a], s = -1;
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
        if (t1 > tmin) { tmin = t1; axis = a; sign = s; }
        if (t2 < tmax) tmax = t2;
      }
      if (!ok || axis < 0 || tmin > tmax || tmin < 0) continue;
      const h = o.clone().add(d.clone().multiplyScalar(tmin));
      const dist = h.clone().applyMatrix4(m.matrixWorld).distanceTo(origin);
      if (best && dist >= best.dist) continue;
      best = { dist, m, h, g: axis * 2 + (sign > 0 ? 0 : 1) };
    }
    return best && texelFromHit(best);
  }
  function texelFromHit({ m, h, g }) {
    const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv, b = g * 4;
    const P = k => [pos.getX(b + k), pos.getY(b + k), pos.getZ(b + k)];
    const U = k => [uv.getX(b + k), uv.getY(b + k)];
    const p0 = P(0), p1 = P(1), p2 = P(2), H = [h.x, h.y, h.z];
    const e1 = p1.map((v, i) => v - p0[i]), e2 = p2.map((v, i) => v - p0[i]), q = H.map((v, i) => v - p0[i]);
    const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
    const s = dot(q, e1) / dot(e1, e1), t = dot(q, e2) / dot(e2, e2);
    const u0 = U(0), u1 = U(1), u2 = U(2);
    const u = u0[0] + s * (u1[0] - u0[0]) + t * (u2[0] - u0[0]);
    const v = u0[1] + s * (u1[1] - u0[1]) + t * (u2[1] - u0[1]);
    const us = [0, 1, 2, 3].map(k => U(k)[0]), vs = [0, 1, 2, 3].map(k => U(k)[1]);
    const x0 = Math.round(Math.min(...us) * 64), x1 = Math.round(Math.max(...us) * 64) - 1;
    const y0 = Math.round((1 - Math.max(...vs)) * 64), y1 = Math.round((1 - Math.min(...vs)) * 64) - 1;
    return {
      x: Math.min(x1, Math.max(x0, Math.floor(u * 64))),
      y: Math.min(y1, Math.max(y0, Math.floor((1 - v) * 64))),
    };
  }
  /* the picker reads what you see: the outer layer where it has colour, the base elsewhere */
  function pickHit3D(e) {
    if (showOverlay) {
      const o = hit3D(e, 'o');
      if (o && px[(o.y * 64 + o.x) * 4 + 3]) return o;
    }
    return hit3D(e, 'b');
  }

  let stroke = null, strokeSrc = null, hover = null, hoverRaf = 0, lastMove = null;
  stage.addEventListener('pointerdown', e => {
    if (!viewer || tool === 'orbit' || e.button !== 0 || e.target !== view) return;
    const picking = tool === 'picker' || e.altKey;
    const hit = picking ? pickHit3D(e) : hit3D(e, paintLayer);
    if (!hit) return; // empty background: let the camera rotate
    e.stopPropagation(); e.preventDefault();
    try { view.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    stroke = beginStroke(hit.x, hit.y, e);
    strokeSrc = stroke ? '3d' : null;
    if (stroke) stroke.layer = paintLayer;
  }, true);
  stage.addEventListener('pointermove', e => {
    if (!viewer || e.target !== view) return;
    if (stroke && strokeSrc === '3d') {
      const hit = hit3D(e, stroke.layer);
      if (hit) continueStroke(stroke, hit.x, hit.y, false);
      return;
    }
    if (e.buttons) return;
    lastMove = e;
    if (!hoverRaf) hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      const hit = tool === 'orbit' ? null : (tool === 'picker' ? pickHit3D(lastMove) : hit3D(lastMove, paintLayer));
      stage.classList.toggle('on-model', !!hit);
      setHover(hit);
    });
  });
  const end3d = () => { if (strokeSrc === '3d') { stroke = null; strokeSrc = null; } };
  stage.addEventListener('pointerup', end3d);
  stage.addEventListener('pointercancel', end3d);
  view.addEventListener('pointerleave', () => { if (!stroke) { stage.classList.remove('on-model'); setHover(null); } });

  /* ---------- 2D texture view ---------- */
  const uv = $('#uv'), uctx = uv.getContext('2d');
  let S = 6, bgKey = '', fgKey = '';
  const bgCan = document.createElement('canvas'), fgCan = document.createElement('canvas');
  const themeKey = () => `${matchMedia('(prefers-color-scheme: dark)').matches}|${document.documentElement.dataset.theme || ''}`;
  function sizeUV() {
    const w = uv.parentElement.clientWidth || 384, dpr = window.devicePixelRatio || 1;
    const s = Math.max(2, Math.floor(Math.min(w, 520) * dpr / 64));
    if (s === S && uv.width === s * 64) return;
    S = s; uv.width = uv.height = S * 64;
    uv.style.width = uv.style.height = (S * 64 / dpr) + 'px';
    bgKey = fgKey = ''; draw2D();
  }
  function buildLayers() {
    const key = `${S}|${doc.slim}|${themeKey()}|${gridOn}`;
    if (key === bgKey) return; bgKey = fgKey = key;
    const W = S * 64, M = tmap();
    for (const c of [bgCan, fgCan]) { c.width = c.height = W; }
    const b = bgCan.getContext('2d');
    b.fillStyle = cssVar('--unused'); b.fillRect(0, 0, W, W);
    b.strokeStyle = cssVar('--unused-line'); b.lineWidth = Math.max(1, S / 6); b.beginPath();
    for (let i = -W; i < W; i += S * 2) { b.moveTo(i, W); b.lineTo(i + W, 0); }
    b.stroke();
    const ca = cssVar('--chk-a'), cb = cssVar('--chk-b'), hh = S / 2;
    for (let k = 0; k < 4096; k++) {
      if (!M[k]) continue;
      const x = (k % 64) * S, y = (k >> 6) * S;
      b.fillStyle = ca; b.fillRect(x, y, S, S);
      b.fillStyle = cb; b.fillRect(x, y, hh, hh); b.fillRect(x + hh, y + hh, S - hh, S - hh);
    }
    const f = fgCan.getContext('2d');
    if (gridOn && S >= 4) {
      f.strokeStyle = cssVar('--grid'); f.lineWidth = 1; f.beginPath();
      for (let i = 1; i < 64; i++) { const p = i * S + .5; f.moveTo(p, 0); f.lineTo(p, W); f.moveTo(0, p); f.lineTo(W, p); }
      f.stroke();
    }
    const lw = Math.max(1, Math.round(S / 5));
    f.lineWidth = lw;
    for (const layer of ['b', 'o']) {
      f.strokeStyle = cssVar(layer === 'b' ? '--outline-b' : '--outline-o');
      for (const p in A.PARTS) {
        const R = A.partRects(p, layer, doc.slim);
        for (const fc of A.FACES) { const [x, y, w, h] = R[fc]; f.strokeRect(x * S + lw / 2, y * S + lw / 2, w * S - lw, h * S - lw); }
      }
    }
  }
  function draw2D() {
    buildLayers();
    const W = S * 64;
    uctx.imageSmoothingEnabled = false;
    uctx.clearRect(0, 0, W, W);
    uctx.drawImage(bgCan, 0, 0);
    uctx.drawImage(tex, 0, 0, W, W);
    uctx.drawImage(fgCan, 0, 0);
    if (hover) {
      const t = tmap()[hover.y * 64 + hover.x];
      const accent = cssVar('--accent');
      if (t) {
        const [fx, fy, fw, fh] = A.partRects(t.p, t.layer, doc.slim)[t.f];
        uctx.globalAlpha = .14; uctx.fillStyle = accent; uctx.fillRect(fx * S, fy * S, fw * S, fh * S); uctx.globalAlpha = 1;
        uctx.strokeStyle = accent; uctx.lineWidth = Math.max(2, S / 4); uctx.strokeRect(fx * S, fy * S, fw * S, fh * S);
      }
      uctx.strokeStyle = cssVar('--fg'); uctx.lineWidth = Math.max(2, S / 4);
      uctx.strokeRect(hover.x * S, hover.y * S, S, S);
    }
  }
  const FACE_PT = { top: 'topo', bottom: 'embaixo', right: 'lado direito', front: 'frente', left: 'lado esquerdo', back: 'costas' };
  function setHover(h) {
    if ((h && hover && h.x === hover.x && h.y === hover.y) || (!h && !hover)) return;
    hover = h; draw2D();
    const st = $('#status');
    if (!h) { st.textContent = 'Passe o cursor sobre a textura para ver cada parte.'; return; }
    const t = tmap()[h.y * 64 + h.x], i = (h.y * 64 + h.x) * 4;
    const col = px[i + 3] ? rgbToHex(px[i], px[i + 1], px[i + 2]).toUpperCase() : 'transparente';
    st.textContent = t
      ? `${t.layer === 'o' ? A.PARTS[t.p].olabel + ' (externa)' : A.PARTS[t.p].label} · ${FACE_PT[t.f]} · x ${h.x}, y ${h.y} · ${col}`
      : `Área que o jogo não usa · x ${h.x}, y ${h.y}`;
  }
  const texelAt = e => {
    const r = uv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * 64), y = Math.floor((e.clientY - r.top) / r.height * 64);
    return x >= 0 && y >= 0 && x < 64 && y < 64 ? { x, y } : null;
  };
  uv.addEventListener('pointerdown', e => {
    const t = texelAt(e); if (!t) return;
    e.preventDefault();
    if (e.button === 2) { pickAt(t.x, t.y); return; }
    if (e.button !== 0) return;
    if (tool === 'orbit') setTool(lastPaintTool);
    try { uv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    stroke = beginStroke(t.x, t.y, e);
    strokeSrc = stroke ? '2d' : null;
  });
  uv.addEventListener('pointermove', e => {
    const t = texelAt(e); setHover(t);
    if (stroke && strokeSrc === '2d' && t) continueStroke(stroke, t.x, t.y, true);
  });
  const end2d = () => { if (strokeSrc === '2d') { stroke = null; strokeSrc = null; } };
  uv.addEventListener('pointerup', end2d);
  uv.addEventListener('pointercancel', end2d);
  uv.addEventListener('pointerleave', () => { if (!stroke) setHover(null); });
  uv.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- loading skins ---------- */
  const builtCache = {};
  const built = def => builtCache[def.id] || (builtCache[def.id] = A.build(def));
  function loadPixels(data, { name, slim, savedId = null, record = true }) {
    if (record) pushUndo();
    px = new Uint8ClampedArray(data);
    doc.name = name; doc.savedId = savedId;
    $('#skinName').value = name;
    applySlim(slim);
    changed();
  }
  function loadDef(def, name) { loadPixels(built(def), { name: name || def.name, slim: def.slim }); }
  const loadImage = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  function pixelsFromImage(im) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    let d = x.getImageData(0, 0, 64, 64).data;
    if (im.naturalHeight === 32) d = upgradeLegacy(d);
    return d;
  }
  /* 64×32 skins have no left limbs: copy the right ones mirrored, as the game does */
  function upgradeLegacy(d) {
    const out = new Uint8ClampedArray(d), M = A.texelMap(false);
    for (let k = 0; k < 4096; k++) {
      const t = M[k];
      if (!t || t.layer !== 'b' || (t.p !== 'rarm' && t.p !== 'rleg')) continue;
      const mf = t.f === 'right' ? 'left' : t.f === 'left' ? 'right' : t.f;
      const r = A.partRects(A.MIRROR[t.p], 'b', false)[mf];
      out.set(d.subarray(k * 4, k * 4 + 4), ((r[1] + t.y) * 64 + r[0] + (t.w - 1 - t.x)) * 4);
    }
    return out;
  }
  function looksSlim(d) {
    for (let y = 20; y < 32; y++) for (let x = 54; x < 56; x++) if (d[(y * 64 + x) * 4 + 3]) return false;
    return true;
  }
  async function importFile(file) {
    if (!file) return;
    if (!/png$/i.test(file.type) && !/\.png$/i.test(file.name)) { toast('Escolha um arquivo PNG.'); return; }
    let im;
    try { im = await loadImage(URL.createObjectURL(file)); } catch (e) { toast('Não consegui abrir esse arquivo como imagem.'); return; }
    if (im.naturalWidth !== 64 || (im.naturalHeight !== 64 && im.naturalHeight !== 32)) {
      toast(`Essa imagem tem ${im.naturalWidth} × ${im.naturalHeight}. A skin precisa ter 64 × 64 ou 64 × 32 pixels.`); return;
    }
    const d = pixelsFromImage(im);
    loadPixels(d, { name: file.name.replace(/\.png$/i, '').slice(0, 40), slim: looksSlim(d) });
    toast(im.naturalHeight === 32 ? 'Skin antiga de 64 × 32 convertida para 64 × 64.' : `“${doc.name}” importada.`);
  }

  /* ---------- saving + downloading ---------- */
  let dlCap;
  const inClaude = () => !!(window.claude && typeof window.claude.use === 'function');
  function downloadsCap() {
    if (dlCap === undefined) dlCap = inClaude() ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
    return dlCap;
  }
  function canvasFrom(data) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), 64, 64), 0, 0);
    return c;
  }
  async function downloadPNG(canvas, name) {
    const filename = slug(name) + '.png';
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    if (inClaude()) {
      const dl = await downloadsCap();
      if (dl) {
        try { await dl.save({ filename, data: blob }); toast(`${filename} enviado para download.`); return; }
        catch (err) {
          const code = err && err.code;
          if (code === 'declined') return;
          if (code === 'rate_limited') { toast('Já existe um download esperando sua confirmação.'); return; }
        }
      }
      showSaveModal(canvas, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function showSaveModal(canvas, filename) {
    $('#saveImg').src = canvas.toDataURL('image/png');
    $('#saveName').textContent = filename;
    $('#saveModal').hidden = false; $('#saveClose').focus();
  }
  function saveMine() {
    const list = store.get(KEY_MINE, []);
    const name = doc.name.trim() || 'Sem nome', png = tex.toDataURL('image/png'), now = Date.now();
    let item = doc.savedId && list.find(s => s.id === doc.savedId);
    if (item) Object.assign(item, { name, slim: doc.slim, png, updated: now });
    else { item = { id: 'm' + now.toString(36), name, slim: doc.slim, png, updated: now }; list.unshift(item); }
    if (!store.set(KEY_MINE, list)) { toast('O navegador bloqueou o armazenamento local. Use Baixar PNG para guardar o arquivo.'); return; }
    doc.savedId = item.id; saveDraft();
    toast(`“${name}” salva em Minhas skins.`);
    renderChips(); if (filter === 'Minhas skins') renderGallery();
  }

  /* ---------- collection ---------- */
  let filter = 'Todas', thumbViewer = null, thumbQueue = [], thumbBusy = false;
  const thumbCache = {};
  const mine = () => { const l = store.get(KEY_MINE, []); return Array.isArray(l) ? l : []; };
  function renderChips() {
    const counts = { Todas: A.SKINS.length };
    for (const s of A.SKINS) counts[s.cat] = (counts[s.cat] || 0) + 1;
    counts['Minhas skins'] = mine().length;
    const box = $('#chips'); box.innerHTML = '';
    for (const c of ['Todas', ...A.CATS, 'Minhas skins']) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-pressed', String(c === filter));
      b.innerHTML = `${c} <span>${counts[c] || 0}</span>`;
      b.onclick = () => { filter = c; renderChips(); renderGallery(); };
      box.appendChild(b);
    }
    $('#navCount').textContent = A.SKINS.length;
  }
  function ensureThumbViewer() {
    if (thumbViewer !== null || !window.skinview3d) return thumbViewer;
    try {
      thumbViewer = new skinview3d.SkinViewer({ width: 240, height: 300, renderPaused: true, preserveDrawingBuffer: true, zoom: .86, fov: 32 });
      thumbViewer.camera.position.set(0, .32, 1); thumbViewer.adjustCameraDistance(); thumbViewer.controls.update();
    } catch (e) { thumbViewer = false; }
    return thumbViewer;
  }
  function thumbFor(key, data, slim, done) {
    if (thumbCache[key]) return done(thumbCache[key]);
    thumbQueue.push({ key, data, slim, done });
    if (!thumbBusy) pumpThumbs();
  }
  function pumpThumbs() {
    const job = thumbQueue.shift();
    if (!job) { thumbBusy = false; return; }
    thumbBusy = true;
    const tv = ensureThumbViewer();
    let res;
    if (tv) {
      tv.loadSkin(canvasFrom(job.data), { model: job.slim ? 'slim' : 'default' });
      tv.playerObject.rotation.y = .5; tv.render();
      const front = tv.canvas.toDataURL('image/png');
      tv.playerObject.rotation.y = Math.PI + .5; tv.render();
      res = { front, back: tv.canvas.toDataURL('image/png'), flat: false };
    } else {
      res = { front: flatView(job.data, job.slim, false), back: flatView(job.data, job.slim, true), flat: true };
    }
    thumbCache[job.key] = res; job.done(res);
    setTimeout(pumpThumbs, 0);
  }
  /* flat front/back picture, used when WebGL is missing */
  function flatView(data, slim, back) {
    const src = canvasFrom(data), c = document.createElement('canvas'); c.width = 16; c.height = 32;
    const x = c.getContext('2d'), f = back ? 'back' : 'front';
    const place = [['head', 4, 0], ['body', 4, 8], [back ? 'larm' : 'rarm', slim ? 1 : 0, 8], [back ? 'rarm' : 'larm', 12, 8], [back ? 'lleg' : 'rleg', 4, 20], [back ? 'rleg' : 'lleg', 8, 20]];
    for (const layer of ['b', 'o']) for (const [p, dx, dy] of place) { const r = A.partRects(p, layer, slim)[f]; x.drawImage(src, r[0], r[1], r[2], r[3], dx, dy, r[2], r[3]); }
    return c.toDataURL('image/png');
  }
  function card({ key, name, meta, desc, data, slim, badge, actions }) {
    const el = document.createElement('article'); el.className = 'card';
    el.innerHTML = `<div class="thumb">${badge ? `<span class="badge">${badge}</span>` : ''}</div>
      <div class="card-body"><h3></h3><p class="meta"></p>${desc ? '<p class="desc"></p>' : ''}<div class="card-actions"></div></div>`;
    el.querySelector('h3').textContent = name;
    el.querySelector('.meta').textContent = meta;
    if (desc) el.querySelector('.desc').textContent = desc;
    const act = el.querySelector('.card-actions');
    for (const a of actions) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm' + (a.primary ? ' primary' : '');
      b.textContent = a.label; b.onclick = () => a.run(b); act.appendChild(b);
    }
    const th = el.querySelector('.thumb');
    thumbFor(key, data, slim, r => {
      const f = new Image(); f.className = 't-front' + (r.flat ? ' flat' : ''); f.src = r.front; f.alt = `${name}, vista de frente`;
      const b = new Image(); b.className = 't-back' + (r.flat ? ' flat' : ''); b.src = r.back; b.alt = '';
      th.append(f, b);
    });
    return el;
  }
  function renderGallery() {
    const grid = $('#grid'); grid.innerHTML = '';
    const empty = $('#emptyMine');
    if (filter === 'Minhas skins') {
      const list = mine();
      empty.hidden = list.length > 0;
      list.forEach(item => {
        loadImage(item.png).then(im => {
          const data = pixelsFromImage(im);
          const el = card({
            key: item.id + ':' + item.updated, name: item.name, data, slim: item.slim,
            meta: `${item.slim ? 'Slim' : 'Clássico'} · salva em ${new Date(item.updated).toLocaleDateString('pt-BR')}`,
            actions: [
              { label: 'Editar', primary: true, run: () => { loadPixels(data, { name: item.name, slim: item.slim, savedId: item.id }); goEditor(item.name); } },
              { label: 'Baixar', run: () => downloadPNG(canvasFrom(data), item.name) },
              { label: 'Excluir', run: b => confirmDelete(b, item) },
            ],
          });
          grid.appendChild(el);
        }).catch(() => {});
      });
      return;
    }
    empty.hidden = true;
    for (const s of A.SKINS) {
      if (filter !== 'Todas' && s.cat !== filter) continue;
      grid.appendChild(card({
        key: s.id, name: s.name, desc: s.desc, data: built(s), slim: s.slim,
        meta: `${s.cat} · ${s.slim ? 'Slim' : 'Clássico'}`,
        badge: s.cat === 'Extras' ? 'Extra' : '',
        actions: [
          { label: 'Editar', primary: true, run: () => { loadDef(s); goEditor(s.name); } },
          { label: 'Baixar', run: () => downloadPNG(canvasFrom(built(s)), s.name) },
        ],
      }));
    }
  }
  function confirmDelete(btn, item) {
    if (btn.dataset.armed) {
      store.set(KEY_MINE, mine().filter(s => s.id !== item.id));
      if (doc.savedId === item.id) doc.savedId = null;
      toast(`“${item.name}” excluída.`); renderChips(); renderGallery(); return;
    }
    btn.dataset.armed = '1'; btn.textContent = 'Confirmar exclusão'; btn.classList.add('danger');
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Excluir'; btn.classList.remove('danger'); } }, 3500);
  }
  function goEditor(name) {
    $('#editor').scrollIntoView({ block: 'start' });
    toast(`${name} aberta no editor. Ctrl+Z desfaz.`);
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('#undoBtn').innerHTML = svg('undo'); $('#redoBtn').innerHTML = svg('redo');
    $('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
    $('#mClassic').onclick = () => setSlim(false);
    $('#mSlim').onclick = () => setSlim(true);
    $('#skinName').addEventListener('input', e => { doc.name = e.target.value; clearTimeout(draftT); draftT = setTimeout(saveDraft, 600); });
    $('#colorIn').addEventListener('input', e => setColor(e.target.value));
    const hexIn = $('#hexIn');
    const commitHex = () => {
      let v = hexIn.value.trim(); if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-f]{6}$/i.test(v)) setColor(v); else { hexIn.value = color.toUpperCase(); toast('Use seis dígitos hexadecimais, como #B3261E.'); }
    };
    hexIn.addEventListener('change', commitHex);
    hexIn.addEventListener('keydown', e => { if (e.key === 'Enter') { commitHex(); hexIn.blur(); } });
    $('#gridTog').addEventListener('change', e => { gridOn = e.target.checked; bgKey = ''; draw2D(); });
    $('#ovToggle').onclick = () => setOverlay(!showOverlay);
    $('#layerB').onclick = () => setPaintLayer('b');
    $('#layerO').onclick = () => setPaintLayer('o');
    $$('[data-view]').forEach(b => { b.onclick = () => setView(+b.dataset.view); });
    $('#anim').addEventListener('change', e => setAnim(e.target.value));

    const newBtn = $('#newBtn'), menu = $('#newMenu');
    const closeMenu = () => { menu.hidden = true; newBtn.setAttribute('aria-expanded', 'false'); };
    newBtn.onclick = () => { const open = menu.hidden; menu.hidden = !open; newBtn.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button').focus(); };
    document.addEventListener('pointerdown', e => { if (!menu.hidden && !e.target.closest('.menu-wrap')) closeMenu(); });
    menu.addEventListener('click', e => {
      const b = e.target.closest('[data-new]'); if (!b) return;
      closeMenu();
      if (b.dataset.new === 'manequim') loadDef(A.TEMPLATES.manequim, 'Nova skin');
      else loadPixels(new Uint8ClampedArray(16384), { name: 'Nova skin', slim: doc.slim });
      toast('Skin nova criada. Ctrl+Z volta para a anterior.');
    });

    $('#fileIn').addEventListener('change', e => { importFile(e.target.files[0]); e.target.value = ''; });
    const ed = $('#editor');
    ed.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    ed.addEventListener('drop', e => { e.preventDefault(); importFile(e.dataTransfer.files[0]); });

    $('#saveBtn').onclick = saveMine;
    $('#dlBtn').onclick = () => downloadPNG(tex, doc.name || 'skin');
    $('#saveClose').onclick = () => { $('#saveModal').hidden = true; };
    $('#saveModal').addEventListener('click', e => { if (e.target.id === 'saveModal') e.target.hidden = true; });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeMenu(); $('#saveModal').hidden = true; return; }
      if (e.target.closest('input, select, textarea')) return;
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); redo(); return; }
      if (mod || e.altKey) return;
      const t = TOOLS.find(t => t.key === k);
      if (t) { setTool(t.id); return; }
      if (k === 'm') { setMirror(!mirror); return; }
      if (/^[1-9]$/.test(k) && recent[+k - 1]) setColor(recent[+k - 1]);
    });

    const themeChanged = () => { bgKey = ''; draw2D(); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);
    new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    new ResizeObserver(sizeUV).observe(uv.parentElement);
  }

  async function start() {
    renderRail(); renderPalettes(); renderHotbar(); wire();
    setColor(color); setTool('pencil'); setPaintLayer('b'); syncHistory();
    const draft = store.get(KEY_DRAFT, null);
    let loaded = false;
    if (draft && typeof draft.png === 'string') {
      try {
        const im = await loadImage(draft.png);
        loadPixels(pixelsFromImage(im), { name: draft.name || 'Sem nome', slim: !!draft.slim, savedId: draft.savedId || null, record: false });
        loaded = true;
      } catch (e) { /* fall back to the showcase skin */ }
    }
    if (!loaded) { const first = A.SKINS[0]; loadPixels(built(first), { name: first.name, slim: first.slim, record: false }); }
    init3D();
    sizeUV();
    renderChips(); renderGallery();
  }
  start();
})();

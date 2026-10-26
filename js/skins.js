/* ---------- Skin geometry + original skin collection (drawn in code, CC0) ---------- */
window.SkinArt = (() => {
  const PARTS = {
    head: { u: 0, v: 0, w: 8, h: 8, d: 8, ou: 32, ov: 0, label: 'Cabeça', olabel: 'Chapéu' },
    body: { u: 16, v: 16, w: 8, h: 12, d: 4, ou: 16, ov: 32, label: 'Tronco', olabel: 'Jaqueta' },
    rarm: { u: 40, v: 16, w: 4, h: 12, d: 4, ou: 40, ov: 32, arm: 1, label: 'Braço dir.', olabel: 'Manga dir.' },
    larm: { u: 32, v: 48, w: 4, h: 12, d: 4, ou: 48, ov: 48, arm: 1, label: 'Braço esq.', olabel: 'Manga esq.' },
    rleg: { u: 0, v: 16, w: 4, h: 12, d: 4, ou: 0, ov: 32, label: 'Perna dir.', olabel: 'Calça dir.' },
    lleg: { u: 16, v: 48, w: 4, h: 12, d: 4, ou: 0, ov: 48, label: 'Perna esq.', olabel: 'Calça esq.' },
  };
  const MIRROR = { head: 'head', body: 'body', rarm: 'larm', larm: 'rarm', rleg: 'lleg', lleg: 'rleg' };
  const FACES = ['top', 'bottom', 'right', 'front', 'left', 'back'];
  const faceRects = (u, v, w, h, d) => ({
    top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h],
    front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + 2 * d + w, v + d, w, h],
  });
  const partDims = (p, slim) => { const P = PARTS[p]; return { w: P.arm && slim ? 3 : P.w, h: P.h, d: P.d }; };
  const partRects = (p, layer, slim) => {
    const P = PARTS[p], D = partDims(p, slim);
    return layer === 'o' ? faceRects(P.ou, P.ov, D.w, D.h, D.d) : faceRects(P.u, P.v, D.w, D.h, D.d);
  };

  /* every texel → {part, layer, face, x, y}; used by the editor for mirroring and fill limits */
  function texelMap(slim) {
    const map = new Array(4096).fill(null);
    for (const p in PARTS) for (const layer of ['b', 'o']) {
      const R = partRects(p, layer, slim);
      for (const f of FACES) {
        const [fx, fy, fw, fh] = R[f];
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) map[(fy + y) * 64 + fx + x] = { p, layer, f, x, y, w: fw, h: fh };
      }
    }
    return map;
  }

  /* ---- colour helpers ---- */
  const hex = s => { s = s.replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), 255]; };
  const sh = (c, k) => {
    const r = [0, 1, 2].map(i => k < 0 ? c[i] * (1 + k) : c[i] + (255 - c[i]) * k);
    r.push(c[3] === undefined ? 255 : c[3]); if (c.flat) r.flat = true; return r;
  };
  const mix = (a, b, t) => { const r = a.map((v, i) => v + (b[i] - v) * t); if (a.flat) r.flat = true; return r; };
  const F = c => { const r = (typeof c === 'string' ? hex(c) : c.slice()); r.flat = true; return r; };
  const L = o => {
    const r = {};
    for (const k in o) {
      const v = o[k];
      if (typeof v === 'string') { const fl = v[0] === '!'; const c = hex(fl ? v.slice(1) : v); if (fl) c.flat = true; r[k] = c; }
      else r[k] = v;
    }
    return r;
  };
  const FS = { top: .07, bottom: -.2, right: -.06, left: -.06, front: 0, back: -.03 };
  const cloth = (c, grad = 0) => (f, x, y) => sh(c, FS[f] - (f === 'top' || f === 'bottom' ? 0 : grad * y));

  function Kit(slim, seed) {
    const t = new Uint8ClampedArray(16384), flat = new Uint8Array(4096);
    const K = { t, slim };
    K.rand = (x, y, s = 0) => {
      let h = (x * 374761393 + y * 668265263 + (seed + s) * 2246822519) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
    };
    K.set = (x, y, c) => {
      if (!c) return; const i = (y * 64 + x) * 4;
      if (c[3] === 0) { t[i] = t[i + 1] = t[i + 2] = t[i + 3] = 0; return; }
      t[i] = c[0]; t[i + 1] = c[1]; t[i + 2] = c[2]; t[i + 3] = c[3] === undefined ? 255 : c[3]; flat[y * 64 + x] = c.flat ? 1 : 0;
    };
    K.fill = (p, c, layer = 'b', faces = FACES) => {
      const D = partDims(p, slim), R = partRects(p, layer, slim);
      const side = p[0] === 'l' ? 'l' : p[0] === 'r' ? 'r' : 'c';
      for (const f of faces) {
        const [fx, fy, fw, fh] = R[f];
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
          let a = -1, fd = -1;
          if (f === 'right') { a = x; fd = D.d - 1 - x; } else if (f === 'front') a = D.d + x;
          else if (f === 'left') { a = D.d + D.w + x; fd = x; } else if (f === 'back') a = 2 * D.d + D.w + x;
          let ox = x;
          if ((f === 'front' && side === 'l') || (f === 'back' && side === 'r')) ox = fw - 1 - x;
          const outer = (side === 'r' && f === 'right') || (side === 'l' && f === 'left');
          const inner = (side === 'r' && f === 'left') || (side === 'l' && f === 'right');
          const col = typeof c === 'function' ? c(f, x, y, { w: fw, h: fh, a, fd, ox, outer, inner, side, gx: fx + x, gy: fy + y, D }) : c;
          K.set(fx + x, fy + y, col);
        }
      }
    };
    K.px = (p, f, x, y, c, layer = 'b') => {
      const [fx, fy, fw, fh] = partRects(p, layer, slim)[f];
      if (x >= 0 && y >= 0 && x < fw && y < fh) K.set(fx + x, fy + y, c);
    };
    K.map = (p, f, str, leg, layer = 'b') => {
      const rows = str.trim().split('\n').map(s => s.trim());
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        if (ch === '_') return K.px(p, f, x, y, [0, 0, 0, 0], layer);
        let c = leg[ch]; if (typeof c === 'function') c = c(x, y);
        if (c) K.px(p, f, x, y, c, layer);
      }));
    };
    K.both = (a, fn) => { for (const p of a === 'arm' ? ['rarm', 'larm'] : ['rleg', 'lleg']) fn(p, p[0]); };
    K.finish = (amp = .05) => {
      for (let i = 0; i < 4096; i++) {
        if (!t[i * 4 + 3] || flat[i]) continue;
        const k = 1 + amp * (K.rand(i % 64, i >> 6, 99) * 2 - 1);
        t[i * 4] *= k; t[i * 4 + 1] *= k; t[i * 4 + 2] *= k;
      }
      return t;
    };
    /* streaky hair colour */
    K.hair = H => (f, x, y, i) => {
      const r = K.rand(i.gx, i.gy >> 1, 7);
      return r < .16 ? sh(H, .14) : r > .84 ? sh(H, -.16) : H;
    };
    return K;
  }

  /* ---- reusable pieces ---- */
  function skinHead(K, S) { K.fill('head', (f) => f === 'bottom' ? sh(S, -.18) : f === 'top' ? S : S); }
  function hairShort(K, H, opt = {}) {
    const hc = K.hair(H);
    K.fill('head', hc, 'b', ['top']);
    K.fill('head', (f, x, y, i) => {
      const d = i.fd; // distance from the face side
      const hair = y <= 1 || (y <= 2 && d > 0) || (y <= 5 && d >= 4) || (y <= 6 && d >= 6) || (opt.long && y <= 7 && d >= 2);
      return hair ? hc(f, x, y, i) : null;
    }, 'b', ['right', 'left']);
    K.fill('head', (f, x, y, i) => (y <= (opt.backRows ?? 6) ? hc(f, x, y, i) : null), 'b', ['back']);
  }
  function hairLong(K, H) {
    const hc = K.hair(H);
    K.fill('head', hc, 'b', ['top', 'back']);
    K.fill('head', (f, x, y, i) => (y <= 1 || i.fd >= 1 || y >= 6 ? hc(f, x, y, i) : null), 'b', ['right', 'left']);
  }
  function arms(K, o) {
    const len = o.len ?? 10;
    K.both('arm', p => K.fill(p, (f, x, y, i) => {
      if (f === 'top') return o.top ? o.top : sh(o.sleeve, .07);
      if (f === 'bottom') return sh(o.hand || o.skin, -.12);
      if (y >= len) return o.hand ? sh(o.hand, FS[f]) : sh(o.skin, FS[f]);
      if (o.cuff && y === len - 1) return sh(o.cuff, FS[f]);
      return sh(o.sleeve, FS[f] - .012 * y);
    }, o.layer || 'b'));
  }
  function legs(K, o) {
    const sH = o.shoeH ?? 2;
    K.both('leg', p => K.fill(p, (f, x, y) => {
      if (f === 'top') return sh(o.pants, .05);
      if (f === 'bottom') return o.sole || sh(o.shoe, -.35);
      if (y >= 12 - sH) return y === 11 ? (o.sole ? sh(o.sole, FS[f]) : sh(o.shoe, FS[f] - .22)) : sh(o.shoe, FS[f] - (y === 12 - sH && o.shoeTop ? -.12 : 0));
      return sh(o.pants, FS[f] - .012 * y);
    }));
  }
  function torso(K, c, grad = .01) { K.fill('body', cloth(c, grad)); }

  /* ================= the collection ================= */
  const SKINS = [];
  const add = s => SKINS.push(s);

  /* ---------------- AVENTURA ---------------- */
  add({
    id: 'cavaleira', name: 'Cavaleira de Ferro', cat: 'Guerreiros', slim: false,
    desc: 'Elmo fechado com pluma, cota de malha e tabardo vermelho.',
    paint(K) {
      const C = L({ S: '#D39A6A', w: '!#FFFFFF', i: '!#2F5D8C', n: '#BD8556', m: '#8C4A3A', h: '#5A3A22',
        I: '#B9C0C8', D: '#737B84', l: '#E4E8EC', R: '#A32F2B', r: '#7A1F1C', Y: '#E0B33A', y: '#B88A1E', B: '#5B3A21', k: '#E0B33A', o: '!#2A2E33' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        hhhhhhhh
        hhhhhhhh
        SSSSSSSS
        SSSSSSSS
        SwiSSiwS
        SSSnnSSS
        SSSmmSSS
        SSSSSSSS`, C);
      // helmet (outer layer)
      const steel = (f, x, y, i) => {
        if (f === 'top') return (x === 3 || x === 4) ? C.R : sh(C.I, .1);
        if (f === 'bottom') return null;
        if (y === 7) return C.D;
        if (y === 0) return C.l;
        return K.rand(i.gx, i.gy, 3) < .1 ? C.D : C.I;
      };
      K.fill('head', steel, 'o');
      K.map('head', 'front', `
        llllllll
        IIIRRIII
        IIIDDIII
        DDDDDDDD
        I__DD__I
        IIIDDIII
        IoIDDIoI
        DDDDDDDD`, C, 'o');
      K.map('head', 'back', `
        lllRRlll
        IIIRRIII
        IIIrrIII
        IIIIIIII`, C, 'o');
      K.px('head', 'right', 4, 3, C.l, 'o'); K.px('head', 'left', 3, 3, C.l, 'o');
      // chainmail body
      const mail = (f, x, y) => f === 'top' || f === 'bottom' ? C.D : ((x + y) % 2 ? sh(C.I, -.28) : sh(C.I, -.08));
      K.fill('body', mail);
      K.fill('body', (f, x, y) => (f === 'front' || f === 'back') && x > 0 && x < 7 ? C.R : null, 'o', ['front', 'back']);
      K.map('body', 'front', `
        l......l
        .RRRRRR.
        .RRYYRR.
        .RYYYYR.
        .RRYYRR.
        .RRYYRR.
        .RRRRRR.
        BBBkkBBB
        .RRRRRR.
        .RRRRRR.
        .RRRrRR.
        .yyyyyy.`, C, 'o');
      K.map('body', 'back', `
        l......l
        ........
        ........
        ........
        ........
        ........
        ........
        BBBBBBBB
        ........
        ........
        ........
        .yyyyyy.`, C, 'o');
      K.fill('body', (f, x, y) => (y === 7 ? C.B : null), 'o', ['right', 'left']);
      // arms: mail with plate pauldrons and gauntlets
      K.both('arm', p => {
        K.fill(p, (f, x, y) => (f === 'bottom' ? C.D : y >= 10 ? sh(C.I, -.15) : mail(f, x, y)));
        K.fill(p, (f, x, y) => {
          if (f === 'top') return C.l;
          if (f === 'bottom') return null;
          if (y <= 3) return y === 0 ? C.l : y === 3 ? C.D : C.I;
          if (y >= 8) return y === 8 ? C.D : y === 11 ? sh(C.I, -.2) : C.I;
          return null;
        }, 'o');
      });
      // legs: mail + greaves
      K.both('leg', p => {
        K.fill(p, (f, x, y) => (f === 'bottom' ? C.o : y >= 10 ? C.D : mail(f, x, y)));
        K.fill(p, (f, x, y) => {
          if (f === 'top' || f === 'bottom') return null;
          if (y === 5) return C.l; if (y === 6) return C.D;
          if (y >= 7) return y >= 10 ? (y === 11 ? sh(C.D, -.3) : C.D) : C.I;
          return null;
        }, 'o');
      });
      return .04;
    },
  });

  add({
    id: 'mago', name: 'Mago Estelar', cat: 'Magia', slim: false,
    desc: 'Túnica azul salpicada de estrelas e uma barba que já viu muitos invernos.',
    paint(K) {
      const C = L({ S: '#F0C6A4', N: '#25327A', n: '#D9A887', W: '#ECECF2', w: '!#FFFFFF', i: '!#2C4FA8', M: '#C9C9D4', B: '#E1E1EA',
        G: '#E8B83A', g: '#B8871C', s: '!#FFE66B', b: '#6B4426' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        NNNNNNNN
        NNNNNNNN
        WSSSSSSW
        WWWSSWWW
        WwiSSiwW
        WSSnnSSW
        WMMMMMMW
        WBBBBBBW`, C);
      K.fill('head', (f, x, y) => (y <= 1 ? C.N : C.W), 'b', ['right', 'left', 'back']);
      const star = (f, x, y, i) => (K.rand(i.gx, i.gy, 11) < .07 ? C.s : C.N);
      K.fill('head', star, 'b', ['top']);
      // hat (outer layer): crown + gold band
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? null : f === 'top' ? star(f, x, y, i) : y <= 1 ? star(f, x, y, i) : y === 2 ? (x % 3 === 1 ? C.g : C.G) : null), 'o');
      K.px('head', 'top', 3, 3, C.s, 'o'); K.px('head', 'top', 4, 4, C.s, 'o');
      // robe
      const robe = (f, x, y, i) => {
        if (f === 'top') return sh(C.N, .08);
        if (f === 'bottom') return sh(C.N, -.25);
        return K.rand(i.gx, i.gy, 5) < .06 ? C.s : sh(C.N, FS[f]);
      };
      K.fill('body', robe);
      K.map('body', 'front', `
        ........
        ........
        ........
        ........
        ........
        ...GG...
        ...GG...
        bbbGGbbb
        ...GG...
        ...GG...
        ...GG...
        GGGGGGGG`, C);
      K.fill('body', (f, x, y) => (y === 7 ? C.b : y === 11 ? C.G : null), 'b', ['right', 'left', 'back']);
      // beard over the chest
      K.map('body', 'front', `
        .BBBBBB.
        .BMBBMB.
        ..BBBB..
        ..BMBB..
        ...BB...`, C, 'o');
      // sleeves
      arms(K, { sleeve: C.N, skin: C.S, len: 10, cuff: C.G });
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f === 'top' || f === 'bottom' ? null : y >= 6 && y <= 9 ? (y === 9 ? C.G : robe(f, x, y, i)) : null), 'o'));
      // robe over legs
      K.both('leg', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.b : y === 11 ? sh(C.b, FS[f]) : y === 10 ? C.G : robe(f, x, y, i))));
      return .04;
    },
  });

  add({
    id: 'pirata', name: 'Pirata Coral', cat: 'Extras', slim: false,
    desc: 'Bandana de bolinhas, tapa-olho e um colete que cheira a maresia.',
    paint(K) {
      const C = L({ S: '#C98A5E', R: '#C0322E', d: '#F2EDE4', K: '#1E1A18', P: '!#141414', i: '!#4A2E1A', w: '!#FFFFFF', n: '#B07448',
        m: '#7A3A2A', T: '#EFE6D2', t: '#D2C6AC', V: '#6B4127', v: '#4E2E1B', Y: '#E3B13C', b: '#2A2524', o: '#3B2A20' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        RRRRRRRR
        RdRRRdRR
        KSSSSSSK
        SPPSSKKS
        SPPSSiwS
        SSSnnSSS
        SKKmmKKS
        SSKKKKSS`, C);
      const band = (f, x, y, i) => ((i.gx + i.gy * 3) % 5 === 0 ? C.d : C.R);
      K.fill('head', band, 'b', ['top']);
      K.fill('head', (f, x, y, i) => (y <= 1 ? band(f, x, y, i) : y <= 5 && (f === 'back' || i.fd >= 3) ? C.K : null), 'b', ['right', 'left', 'back']);
      K.fill('head', (f, x, y) => (y === 4 ? C.P : null), 'b', ['right']);
      K.px('head', 'left', 1, 6, F('#F2C54B'));
      K.map('head', 'back', `
        ........
        ..RRRR..
        ...RR...
        ..R..R..
        ..R..R..`, C, 'o');
      // shirt + vest
      torso(K, C.T);
      K.map('body', 'front', `
        TTTSSTTT
        TTTSSTTT
        TTTtSTTT
        ........
        ........
        ........
        ........
        bbbYYbbb
        RRRRRRRR
        RRRRRRRR
        ........
        ........`, C);
      K.fill('body', (f, x, y) => (y === 7 ? C.b : y === 8 || y === 9 ? sh(C.R, FS[f]) : null), 'b', ['right', 'left', 'back']);
      K.fill('body', (f, x, y) => {
        if (f === 'top' || f === 'bottom' || y > 6) return null;
        if (f === 'front') return x <= 1 || x >= 6 ? (x === 1 || x === 6 ? C.v : C.V) : null;
        return sh(C.V, FS[f]);
      }, 'o');
      arms(K, { sleeve: C.T, skin: C.S, len: 10, cuff: C.t });
      legs(K, { pants: C.o, shoe: C.b, shoeH: 5, shoeTop: true });
      K.both('leg', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && y === 7 ? sh(C.V, FS[f]) : null)));
      return .05;
    },
  });

  add({
    id: 'ninja', name: 'Ninja da Lua', cat: 'Guerreiros', slim: false,
    desc: 'Capuz azul-noite, faixa vermelha com placa de prata e tornozelos amarrados.',
    paint(K) {
      const C = L({ N: '#1F2544', n: '#171B33', S: '#E0AC7E', K: '!#15121A', w: '!#F4F4F4', R: '#B3282D', r: '#871B20', s: '#C9D0D8', Y: '!#F2D25C', G: '#7C8494', g: '#5F6676' });
      K.fill('head', cloth(C.N));
      K.map('head', 'front', `
        NNNNNNNN
        NNNNNNNN
        NNNNNNNN
        NSKSSKSN
        NwKSSKwN
        NNNNNNNN
        NnNNNNnN
        NNNNNNNN`, C);
      K.fill('head', (f, x, y) => (f !== 'top' && f !== 'bottom' && y === 2 ? C.R : null), 'o');
      K.map('head', 'front', `
        ........
        ........
        RRsYssRR`, C, 'o');
      K.map('head', 'back', `
        ........
        ........
        RRRRRRRR
        ...RR...
        ..R..R..
        ..R..R..
        .R....R.`, C, 'o');
      torso(K, C.N);
      K.map('body', 'front', `
        NNSSSSNN
        NGNSSNGN
        NNGNNGNN
        NNNGGNNN
        NNNGGNNN
        NNGNNGNN
        NNNNNNNN
        RRRRRRRR
        RRRrrRRR
        NNNrrNNN
        NNNNNNNN
        nnnnnnnn`, C);
      K.fill('body', (f, x, y) => (y === 7 || y === 8 ? sh(C.R, FS[f]) : null), 'b', ['right', 'left', 'back']);
      arms(K, { sleeve: C.N, skin: C.n, len: 12 });
      K.both('arm', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && y >= 6 && y <= 9 ? ((x + y) % 2 ? C.G : C.g) : null)));
      legs(K, { pants: C.N, shoe: C.K, shoeH: 2 });
      K.both('leg', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && y >= 6 && y <= 9 ? ((x + y) % 2 ? C.G : C.g) : null)));
      return .05;
    },
  });

  add({
    id: 'arqueira', name: 'Arqueira da Mata', cat: 'Guerreiros', slim: true,
    desc: 'Capuz verde-musgo, aljava nas costas e sardas de quem vive ao sol.',
    paint(K) {
      const C = L({ S: '#F0C3A0', A: '#9C4A23', a: '#7A3519', b: '#6B2E14', w: '!#FFFFFF', g: '!#3E8C4A', f: '#D79A73', n: '#E0AE8A', m: '#C4665A',
        G: '#3F6E36', D: '#2C5026', l: '#5E8F48', T: '#7A5230', t: '#5A3A20', Y: '#D9B45A', W: '!#F3F0E6', r: '!#B33A3A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        AAAAAAAA
        AAAaAAAA
        ASSSSSSA
        AbbSSbbA
        AwgSSgwA
        SfSnnSfS
        SSSmmSSS
        SSSSSSSS`, C);
      hairLong(K, C.A);
      // hood
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? null : f === 'top' ? sh(C.G, .06) : (K.rand(i.gx, i.gy, 2) < .12 ? C.D : sh(C.G, FS[f]))), 'o', ['top', 'bottom', 'right', 'left', 'back']);
      K.map('head', 'front', `
        GGGGGGGG
        GG....GG
        G......G
        G......G
        G......G
        D......D`, C, 'o');
      // tunic, corset and the diagonal quiver strap
      torso(K, C.G);
      K.fill('body', (f, x, y) => {
        if (f !== 'front' && f !== 'back') return null;
        const sx = f === 'front' ? 7 - Math.floor(y * 7 / 11) : Math.floor(y * 7 / 11);
        if (x === sx) return C.T; if (x === sx - 1 && f === 'front') return C.t;
        if (y === 9) return C.t;
        if (y >= 6 && y <= 8 && f === 'front') return (x === 3 || x === 4) ? C.Y : C.T;
        return null;
      });
      K.fill('body', (f, x, y) => (y === 9 ? sh(C.t, FS[f]) : null), 'b', ['right', 'left']);
      K.map('body', 'back', `
        .WrW....
        .TTT....
        .TtT....
        .TTT....
        .TtT....
        .TTT....
        .TtT....
        .TTT....
        .ttt....`, C, 'o');
      arms(K, { sleeve: C.G, skin: C.S, len: 10, cuff: C.t });
      K.both('arm', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && y >= 6 && y <= 8 ? sh(y === 7 ? C.Y : C.T, FS[f]) : null)));
      legs(K, { pants: C.T, shoe: C.t, shoeH: 6, shoeTop: true });
      return .05;
    },
  });

  /* ---------------- FICÇÃO CIENTÍFICA ---------------- */
  add({
    id: 'astronauta', name: 'Astronauta Órbita', cat: 'Extras', slim: false,
    desc: 'Traje branco, viseira dourada espelhada e mochila de suporte de vida.',
    paint(K) {
      const C = L({ W: '#EDEFF2', w: '#C9CED6', g: '#9AA2AD', d: '#6C747F', V: '#E2A93B', v: '#B9761E', h: '!#FFF4C8', k: '#2B2F36',
        O: '#F07F2A', B: '#2E6BD1', r: '!#E33B3B', G: '!#3BD16B', S: '#D39A6A', i: '!#2B2B2B' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        WWWWWWWW
        WWWWWWWW
        SSSSSSSS
        SwiSSiwS
        SSSSSSSS
        SSSSSSSS
        SSSSSSSS
        wwwwwwww`, C);
      K.fill('head', cloth(C.W), 'b', ['top', 'right', 'left', 'back']);
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : f === 'top' ? C.W : y === 7 ? C.w : sh(C.W, FS[f])), 'o');
      K.map('head', 'front', `
        WWWWWWWW
        WvvvvvvW
        WVhhVVVW
        WVhVVVVW
        WVVVVVvW
        WVVVVvvW
        WvvvvvvW
        gggggggg`, C, 'o');
      K.map('head', 'right', `
        ........
        ........
        ........
        ...gg...
        ...gG...
        ...gg...`, C, 'o');
      K.map('head', 'left', `
        ........
        ........
        ........
        ...gg...
        ...rg...
        ...gg...`, C, 'o');
      torso(K, C.W);
      K.map('body', 'front', `
        gggggggg
        WWWWWWWW
        WWkkkkWW
        WWkrGkWW
        WWkBkkWW
        WWkkkkWW
        WWWWWWWW
        OOOOOOOO
        ddddgddd
        WWWWWWWW
        WWWWWWWW
        wwwwwwww`, C);
      K.fill('body', (f, x, y) => (y === 7 ? sh(C.O, FS[f]) : y === 8 ? C.d : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'back', `
        ........
        gggggggg
        gddddddg
        gdgggddg
        gddddddg
        gdOOOOdg
        gddddddg
        gdgdgddg
        gddddddg
        gggggggg`, C, 'o');
      arms(K, { sleeve: C.W, skin: C.g, hand: C.g, len: 9 });
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f !== 'top' && f !== 'bottom' && y === 2 ? (i.outer || f === 'front' ? C.B : C.W) : null)));
      K.both('arm', p => K.fill(p, (f, x, y) => (f === 'top' ? null : f === 'bottom' ? C.g : y >= 9 ? (y === 9 ? C.d : C.g) : null), 'o'));
      legs(K, { pants: C.W, shoe: C.g, shoeH: 3, sole: C.k });
      K.both('leg', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && (y === 4 || y === 5) && f === 'front' ? C.w : null)));
      return .03;
    },
  });

  add({
    id: 'robo', name: 'Robô R-07', cat: 'Extras', slim: false,
    desc: 'Carcaça de aço azulado, olhos de LED ciano e juntas laranja.',
    paint(K) {
      const C = L({ M: '#6E8D9B', m: '#56717E', D: '#2D3A42', l: '#A8C3CF', C: '!#5FF3FF', c: '!#1FB6CC', O: '#F28C28', o: '#C76A14',
        g: '#8FA9B5', k: '!#1A2328', G: '!#5CF07A', R: '!#FF4F4F' });
      const metal = (f, x, y, i) => (f === 'top' ? C.l : f === 'bottom' ? C.D : K.rand(i.gx, i.gy, 4) < .08 ? C.m : sh(C.M, FS[f]));
      K.fill('head', metal);
      K.map('head', 'front', `
        llllllll
        MDMMMMDM
        MkkkkkkM
        MCCkkCCM
        MccDkccM
        MkkkkkkM
        MglglglM
        mmmmmmmm`, C);
      K.map('head', 'back', `
        llllllll
        MMMMMMMM
        MDDDDDDM
        MDgDDgDM
        MDDDDDDM
        MMMMMMMM
        MlMlMlMM
        mmmmmmmm`, C);
      K.map('head', 'top', `
        ........
        ........
        ........
        ...OO...
        ...OO...`, C, 'o');
      for (const f of ['right', 'left']) K.map('head', f, `
        ........
        ........
        ...OO...
        ..OooO..
        ..OooO..
        ...OO...`, C, 'o');
      K.fill('body', metal);
      K.map('body', 'front', `
        OMMMMMMO
        MMMMMMMM
        MkkkkkkM
        MkGkkRkM
        MkkkkkkM
        MkCCCCkM
        MkkkkkkM
        MMMMMMMM
        DDDDDDDD
        MlMlMlMM
        MMMMMMMM
        mmmmmmmm`, C);
      K.fill('body', (f, x, y) => (y === 8 ? C.D : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'back', `
        ........
        .DDDDDD.
        .DlDlDD.
        .DDDDDD.
        .DlDlDD.
        .DDDDDD.`, C);
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.D : y === 4 || y === 9 ? sh(C.O, FS[f]) : y >= 10 ? sh(C.D, FS[f]) : metal(f, x, y, i))));
      K.both('leg', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.k : y === 6 ? sh(C.O, FS[f]) : y >= 9 ? (y === 11 ? C.k : sh(C.D, FS[f])) : metal(f, x, y, i))));
      return .03;
    },
  });



  /* ---------------- DIA A DIA ---------------- */
  add({
    id: 'gamer', name: 'Gamer de Moletom', cat: 'Extras', slim: false,
    desc: 'Moletom roxo, fone com luz RGB e tênis branco impecável.',
    paint(K) {
      const C = L({ S: '#EDBB94', H: '#5A3A22', b: '#3E2715', w: '!#FFFFFF', i: '!#3A6B3A', n: '#D9A47C', m: '#A85F4E',
        P: '#6A3FB5', p: '#4E2C8C', W: '#F2F2F2', K: '#1C1C22', k: '#34343E', C: '!#3DF5FF', M: '!#FF4FD8', J: '#3B5A8C', j: '#2C4570', R: '#D33B3B' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        HSHHSSHH
        SbbSSbbS
        SwiSSiwS
        SSSnnSSS
        SSSmmSSS
        SSSSSSSS`, C);
      hairShort(K, C.H);
      // messy tufts on the outer layer
      K.fill('head', (f, x, y, i) => (f === 'top' ? (K.rand(i.gx, i.gy, 1) < .35 ? sh(C.H, .1) : null) : null), 'o');
      K.map('head', 'front', `
        H.H..H.H
        .....H..`, C, 'o');
      // headphones
      K.map('head', 'top', `
        ........
        ........
        ........
        KkKKKKkK
        KKKKKKKK`, C, 'o');
      for (const f of ['right', 'left']) K.map('head', f, `
        ...KK...
        ...KK...
        ..kKKk..
        .kKCMKk.
        .KCKKMK.
        .KMKKCK.
        .kKMCKk.
        ..kKKk..`, C, 'o');
      torso(K, C.P);
      K.map('body', 'front', `
        PPPSSPPP
        PPWPPWPP
        PPWPPWPP
        PPWPPWPP
        PPPPPPPP
        PPPWWPPP
        PPWPPWPP
        PpppppPP
        PpPPPPpP
        PpPPPPpP
        PPPPPPPP
        pppppppp`, C);
      K.fill('body', (f, x, y) => (y === 11 ? sh(C.p, FS[f]) : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'back', `
        .pPPPPp.
        .pPPPPp.
        ..pPPp..
        ...pp...`, C, 'o');
      arms(K, { sleeve: C.P, skin: C.S, len: 10, cuff: C.p });
      legs(K, { pants: C.J, shoe: C.W, shoeH: 2, sole: C.R });
      K.both('leg', p => K.fill(p, (f, x, y, i) => (f === 'front' && (y === 5) ? sh(C.J, .15) : i.outer && y < 10 && x === 2 ? C.j : null)));
      return .05;
    },
  });





  /* ---------------- TERROR ---------------- */


  add({
    id: 'abobora', name: 'Cabeça de Abóbora', cat: 'Sombras', slim: false,
    desc: 'Espantalho com abóbora entalhada que brilha, camisa xadrez e jardineira remendada.',
    paint(K) {
      const C = L({ O: '#E8821E', o: '#C46510', Y: '!#FFD33D', y: '!#FF9F1C', g: '#4E7A2A', G: '#6B9A3A', b: '#5C3A1E',
        R: '#A8322C', r: '#5A1A18', J: '#3E5F8A', j: '#2E4A6E', s: '#D9B44A', S: '#B8902E', B: '#5A3A22', P: '#8A5A2E', Q: '!#F2D05A' });
      K.fill('head', (f, x, y) => (f === 'bottom' ? C.o : f === 'top' ? ((x === 0 || x === 7 || y === 0 || y === 7) ? C.o : C.O) : (x % 3 === 0 ? C.o : C.O)));
      K.map('head', 'front', `
        oOOooOOo
        oOOooOOo
        oOYooYOo
        oYYooYYo
        oOOyyOOo
        oYOooOYo
        oYYYYYYo
        oOYooYOo`, C);
      K.map('head', 'top', `
        ........
        ........
        ...G....
        ..GgGb..
        ...bb...
        ........`, C);
      K.map('head', 'top', `
        ........
        ........
        ..GG....
        ...bb...
        ...bb...`, C, 'o');
      const plaid = (f, x, y, i) => {
        const a = i.a < 0 ? x : i.a, v = (a % 4 === 1) + (y % 4 === 1);
        return sh(v === 2 ? C.r : v === 1 ? mix(C.R, C.r, .5) : C.R, FS[f]);
      };
      K.fill('body', plaid);
      K.map('body', 'front', `
        QsQ..QsQ
        .J....J.
        .J....J.
        .J....J.
        .Y....Y.
        JJJJJJJJ
        JJjjjjJJ
        JjJJJJjJ
        JjJJJJjJ
        JJjjjjJJ
        JJJJJJJJ
        jjjjjjjj`, C);
      K.fill('body', (f, x, y) => (y >= 5 ? sh(C.J, FS[f]) : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'back', `
        .J....J.
        ..J..J..
        ...JJ...
        ...JJ...
        ...JJ...`, C);
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.S : y >= 10 ? ((x + y) % 2 ? C.s : C.S) : plaid(f, x, y, i))));
      K.both('arm', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && y === 10 && x % 2 === 0 ? C.Q : null), 'o'));
      legs(K, { pants: C.J, shoe: C.B, shoeH: 2 });
      K.both('leg', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && y === 9 ? ((x + y) % 2 ? C.s : C.S) : null)));
      K.map('lleg', 'front', `
        ....
        ....
        ....
        ....
        .PP.
        .PP.`, C);
      return .05;
    },
  });

  add({
    id: 'vampira', name: 'Condessa Vampira', cat: 'Sombras', slim: true,
    desc: 'Pele pálida, olhos vermelhos, capa de gola alta e espartilho vinho.',
    paint(K) {
      const C = L({ S: '#EADBD6', s: '#D8C3BD', K: '#141218', k: '!#0D0B10', w: '!#FFFFFF', r: '!#D6182E', l: '#6E0F22', n: '#DDC9C3',
        V: '#6E1530', v: '#4A0D20', B: '#16141A', b: '#26222C', R: '#A3122C', G: '#B8963A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        KKKKKKKK
        KKKKKKKK
        KSSKKSSK
        KkkSSkkK
        KwrSSrwK
        KSSSSSSK
        KSSllSSK
        KSSwSwSK`, C);
      hairLong(K, C.K);
      K.fill('head', (f, x, y, i) => (f === 'top' || f === 'back' || ((f === 'right' || f === 'left') && i.fd >= 2) ? (K.rand(i.gx, i.gy, 4) < .25 ? sh(C.K, .12) : null) : null), 'o');
      torso(K, C.V);
      K.map('body', 'front', `
        KSSSSSSK
        KSSSSSSK
        VvVVVVvV
        VVkVVkVV
        VVVkkVVV
        VVkVVkVV
        VVVkkVVV
        VVkVVkVV
        vvvvvvvv
        BBBBBBBB
        BbBBBBbB
        BBBBBBBB`, C);
      K.fill('body', (f, x, y) => (y >= 9 ? sh(C.B, FS[f]) : null), 'b', ['right', 'left', 'back']);
      // cape: high collar + back
      K.fill('body', (f, x, y) => {
        if (f === 'top' || f === 'bottom') return null;
        if (f === 'front') return x === 0 || x === 7 ? (y <= 2 ? C.R : C.B) : null;
        if (f === 'back') return y === 0 ? C.R : sh(C.B, -.1);
        return y <= 1 ? C.R : sh(C.B, FS[f]);
      }, 'o');
      arms(K, { sleeve: C.B, skin: C.S, len: 10, cuff: C.R });
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f !== 'top' && f !== 'bottom' && y < 9 && (x + y) % 3 === 0 ? C.b : null)));
      legs(K, { pants: C.B, shoe: C.k, shoeH: 4, shoeTop: true });
      K.both('leg', p => K.fill(p, (f, x, y) => (f === 'front' && y >= 8 && y <= 10 && x === 1 ? C.R : null)));
      return .03;
    },
  });

  /* ---------------- FOFOS ---------------- */
  function onesie(K, o) {
    const C = o.C;
    skinHead(K, C.S);
    K.map('head', 'front', `
      OOOOOOOO
      OOOOOOOO
      OhhhhhhO
      SkwSSkwS
      SkkSSkkS
      SpSSSSpS
      SSSmmSSS
      SSSSSSSS`, C);
    K.fill('head', (f) => (f === 'bottom' ? null : sh(C.O, FS[f])), 'b', ['top', 'right', 'left', 'back']);
    K.fill('head', (f) => (f === 'bottom' ? null : sh(C.O, FS[f])), 'o', ['top', 'right', 'left', 'back']);
    K.map('head', 'front', `
      OOOOOOOO
      OCCCCCCO
      C......C
      C......C
      C......C
      C......C
      C......C
      .C....C.`, C, 'o');
    K.map('head', 'top', o.ears, C, 'o');
  }

  add({
    id: 'raposa', name: 'Pijama de Raposa', cat: 'Extras', slim: false,
    desc: 'Capuz de raposa com orelhas, barriga creme e rabo de ponta branca.',
    paint(K) {
      const C = L({ S: '#F2CDB0', O: '#E8782A', o: '#B85A1A', C: '#F5E6CF', h: '#7A4A2A', k: '!#1C1A1A', w: '!#FFFFFF', p: '#F2A5A0', m: '#B0605A', K: '#2A2222' });
      onesie(K, { C, ears: `
        KoOOOOoK
        oCO..OCo
        oO....Oo` });
      torso(K, C.O);
      K.map('body', 'front', `
        OOOOOOOO
        OOCCCCOO
        OCCCCCCO
        OCCCCCCO
        OCCCCCCO
        OCCCCCCO
        OCCCCCCO
        OCCCCCCO
        OCCCCCCO
        OCCCCCCO
        OOCCCCOO
        oooooooo`, C);
      K.map('body', 'back', `
        ........
        ........
        ........
        ........
        ..oOOo..
        ..OOOO..
        ..OOOO..
        ..OOOO..
        ..oOOo..
        ..CCCC..
        ..CCCC..
        ...CC...`, C, 'o');
      arms(K, { sleeve: C.O, skin: C.K, hand: C.K, len: 9 });
      legs(K, { pants: C.O, shoe: C.K, shoeH: 5 });
      return .03;
    },
  });



  /* ================= MEDIEVAL ================= */
  const ermine = (W, k) => (f, x, y, i) => ((i.gx * 2 + i.gy * 3) % 7 === 0 ? k : W);

  add({
    id: 'paladino', name: 'Paladino Dourado', cat: 'Guerreiros', slim: false,
    desc: 'Armadura polida com filetes de ouro e tabardo azul com um sol bordado.',
    paint(K) {
      const C = L({ S: '#E3B08A', w: '!#FFFFFF', i: '!#3C6E2E', n: '#CF9A72', m: '#9A5A48', h: '#C9A050',
        W: '#DCE1E6', V: '#B4BCC6', D: '#868F9A', G: '#E5B83C', g: '#B98C1C', A: '#2F5DA8', a: '#244A86', Y: '!#FFD84A', o: '!#30343A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        hhhhhhhh
        hhhhhhhh
        SSSSSSSS
        SSSSSSSS
        SwiSSiwS
        SSSnnSSS
        SSSmmSSS
        SSSSSSSS`, C);
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? null : f === 'top' ? (x === 3 || x === 4 ? C.G : C.W) : y === 0 || y === 7 ? C.G : (K.rand(i.gx, i.gy, 3) < .08 ? C.V : sh(C.W, FS[f]))), 'o');
      K.map('head', 'front', `
        GGGGGGGG
        WWWGGWWW
        WWWGGWWW
        VVVGGVVV
        W______W
        WVV__VVW
        WWW__WWW
        GGGGGGGG`, C, 'o');
      for (const f of ['right', 'left']) K.map('head', f, `
        ........
        ........
        ........
        ........
        ..D.D.D.
        ...D.D..`, C, 'o');
      const plate = (f, x, y, i) => (f === 'top' ? sh(C.W, .08) : f === 'bottom' ? C.D : (K.rand(i.gx, i.gy, 5) < .08 ? C.V : sh(C.W, FS[f] - .01 * y)));
      K.fill('body', plate);
      K.fill('body', (f, x) => (x > 0 && x < 7 ? C.A : null), 'o', ['front', 'back']);
      K.map('body', 'front', `
        G......G
        .AAAAAA.
        .AAGGAA.
        .AGYYGA.
        .AGYYGA.
        .AAGGAA.
        .AAAAAA.
        VVVGGVVV
        .AAAAAA.
        .AAAAAA.
        .aAAAAa.
        .GGGGGG.`, C, 'o');
      K.map('body', 'back', `
        G......G
        ........
        ...GG...
        ..G..G..
        ...GG...
        ........
        ........
        VVVVVVVV
        ........
        ........
        .aAAAAa.
        .GGGGGG.`, C, 'o');
      K.fill('body', (f, x, y) => (y === 7 ? C.V : null), 'o', ['right', 'left']);
      K.both('arm', p => {
        K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.D : plate(f, x, y, i)));
        K.fill(p, (f, x, y) => (f === 'top' ? C.G : f === 'bottom' ? null : y <= 3 ? (y === 3 ? C.G : C.W) : y === 8 ? C.G : y >= 9 ? sh(C.V, FS[f]) : null), 'o');
      });
      K.both('leg', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.o : y === 5 ? sh(C.G, FS[f]) : y >= 10 ? sh(C.D, FS[f]) : plate(f, x, y, i))));
      return .03;
    },
  });

  add({
    id: 'guarda', name: 'Guarda do Castelo', cat: 'Guerreiros', slim: false,
    desc: 'Chapéu de ferro, gibão acolchoado e o brasão esquartelado do reino.',
    paint(K) {
      const C = L({ S: '#D9A27A', H: '#6B4A2E', M: '#4A321E', w: '!#FFFFFF', i: '!#5A3A1E', n: '#C48C64', m: '#8E4E3C',
        I: '#A9B0B8', D: '#6E757E', l: '#D3D8DE', T: '#C9A66B', t: '#A8864E', B: '#2F5DA8', Y: '#E2B33C', k: '#2A2420', R: '#7A2A2A', b: '#5C3A20' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        HSSSSSSH
        SMMSSMMS
        SwiSSiwS
        SSSnnSSS
        SMMMMMMS
        SSSmmSSS`, C);
      hairShort(K, C.H);
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : f === 'top' ? ((x + y) % 5 === 0 ? C.l : C.I) : y <= 1 ? sh(C.I, FS[f]) : y === 2 ? C.D : null), 'o');
      K.map('head', 'front', `
        llllllll
        IIIIIIII
        DDDDDDDD`, C, 'o');
      const quilt = (f, x, y, i) => sh((i.gx + i.gy) % 3 === 0 ? C.t : C.T, FS[f] - (f === 'top' || f === 'bottom' ? 0 : .01 * y));
      K.fill('body', quilt);
      K.map('body', 'front', `
        ........
        .BBBYYY.
        .BBBYYY.
        .BBBYYY.
        .BBBYYY.
        .BBBYYY.
        kkkkYkkk
        .YYYBBB.
        .YYYBBB.
        .YYYBBB.
        .YYYBBB.
        .YYYBBB.`, C, 'o');
      K.map('body', 'back', `
        ........
        .YYYBBB.
        .YYYBBB.
        .YYYBBB.
        .YYYBBB.
        .YYYBBB.
        kkkkkkkk
        .BBBYYY.
        .BBBYYY.
        .BBBYYY.
        .BBBYYY.
        .BBBYYY.`, C, 'o');
      K.fill('body', (f, x, y) => (y === 6 ? C.k : null), 'o', ['right', 'left']);
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.b : y >= 10 ? sh(C.b, FS[f]) : quilt(f, x, y, i))));
      legs(K, { pants: C.R, shoe: C.b, shoeH: 5, shoeTop: true });
      return .04;
    },
  });

  add({
    id: 'viking', name: 'Viking do Norte', cat: 'Guerreiros', slim: false,
    desc: 'Elmo com protetor de nariz, barba ruiva trançada e manto de pele.',
    paint(K) {
      const C = L({ S: '#EDBE9A', R: '#B5481E', r: '#8C3412', w: '!#FFFFFF', i: '!#3D7BC2', n: '#D9A47E', m: '#6E2A16',
        I: '#9AA1A8', D: '#5F666E', l: '#C9CFD5', G: '#3F5A3A', U: '#8A7458', u: '#6B573F', F: '#B8A88E', f: '#8E7E66',
        b: '#5A3A20', B: '#3A2614', Y: '!#E3B83C', W: '#9A9590' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        RRRRRRRR
        RRRRRRRR
        RSSSSSSR
        RrrSSrrR
        RwiSSiwR
        RSSnnSSR
        RRRmmRRR
        RRRRRRRR`, C);
      hairLong(K, C.R);
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : f === 'top' ? (x === 3 || x === 4 || y === 3 || y === 4 ? C.D : C.I) : y <= 1 ? sh(C.I, FS[f]) : y === 2 ? C.D : null), 'o');
      K.map('head', 'front', `
        lIIDDIIl
        IIIDDIII
        DDDDDDDD
        ...DD...
        ...DD...`, C, 'o');
      K.fill('body', cloth(C.G, .01));
      K.map('body', 'front', `
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        bbbYYbbb
        ........
        ........
        ........`, C);
      K.fill('body', (f, x, y) => (y === 8 ? sh(C.b, FS[f]) : null), 'b', ['right', 'left', 'back']);
      const fur = (f, x, y, i) => (K.rand(i.gx, i.gy, 6) < .35 ? C.f : C.F);
      K.map('body', 'front', `
        FRRRRRRF
        F.RRRR.F
        ..R..R..
        ..r..r..
        ..Y..Y..`, C, 'o');
      K.fill('body', (f, x, y, i) => (f === 'top' || f === 'bottom' ? null : f === 'back' ? (y <= 1 ? fur(f, x, y, i) : sh(C.U, -.05 - .01 * y)) : y <= 1 ? fur(f, x, y, i) : null), 'o', ['right', 'left', 'back']);
      K.both('arm', p => {
        K.fill(p, (f, x, y) => (f === 'top' ? C.G : f === 'bottom' ? sh(C.S, -.12) : y <= 3 ? sh(C.G, FS[f]) : y >= 6 && y <= 9 ? sh(y === 6 ? C.Y : C.b, FS[f]) : sh(C.S, FS[f])));
        K.fill(p, (f, x, y, i) => (f === 'bottom' ? null : f === 'top' || y <= 1 ? fur(f, x, y, i) : null), 'o');
      });
      K.both('leg', p => K.fill(p, (f, x, y, i) => {
        if (f === 'top') return C.U; if (f === 'bottom') return C.B;
        if (y >= 10) return sh(C.B, FS[f]);
        if (y >= 5) return sh((x + y + i.gx) % 2 ? C.W : C.u, FS[f]);
        return sh(C.U, FS[f]);
      }));
      return .05;
    },
  });

  add({
    id: 'bruxa', name: 'Bruxa do Pântano', cat: 'Magia', slim: true,
    desc: 'Chapéu com fivela, mecha verde no cabelo e poções presas no cinto.',
    paint(K) {
      const C = L({ S: '#E8D6C8', K: '#1E1424', V: '#2E8C5A', k: '!#140E18', w: '!#FFFFFF', g: '!#3BCF6E', n: '#D9C2B2', l: '#5A2A5E',
        P: '#3B2350', p: '#2A1838', H: '#1A1A1F', h: '#6B3FA0', B: '#5A3A20', Y: '!#E3B83C', r: '!#E33B5B', c: '!#4FD1FF', e: '!#9CFF5A', s: '#7A4FB0' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        KKKKKKKK
        KKKKKVKK
        KSSSSVKK
        KkkSSkkK
        KwgSSgwK
        KSSnnSSK
        KSSllSSK
        KSSSSSSK`, C);
      hairLong(K, C.K);
      K.fill('head', (f, x, y) => (x === 5 ? C.V : null), 'b', ['top']);
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : f === 'top' ? C.H : y <= 1 ? sh(C.H, FS[f]) : y === 2 ? C.h : null), 'o');
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        hhhYYhhh`, C, 'o');
      K.fill('body', cloth(C.P, .01));
      K.map('body', 'front', `
        PPSSSSPP
        PPPSSPPP
        PPkPPkPP
        PPPkkPPP
        PPkPPkPP
        PPPkkPPP
        PPkPPkPP
        BBBBYBBB
        PPPPPPPP
        PPPPPPPP
        PpPPpPPp
        pppppppp`, C);
      K.fill('body', (f, x, y) => (y === 7 ? sh(C.B, FS[f]) : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'front', `
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        .B..B.B.
        .r..c.e.
        .r..c...`, C, 'o');
      arms(K, { sleeve: C.P, skin: C.S, len: 10, cuff: C.p });
      K.both('arm', p => K.fill(p, (f, x, y) => (f === 'top' || f === 'bottom' ? null : y >= 6 && y <= 9 ? sh(C.p, FS[f]) : null), 'o'));
      K.both('leg', p => K.fill(p, (f, x, y) => (f === 'top' ? C.P : f === 'bottom' ? C.k : y >= 9 ? (y === 11 ? C.k : sh(C.H, FS[f])) : sh(y % 2 ? C.s : C.H, FS[f]))));
      return .03;
    },
  });

  add({
    id: 'druida', name: 'Druida do Carvalho', cat: 'Magia', slim: false,
    desc: 'Coroa de folhas, marca de anil na testa e manto verde-musgo.',
    paint(K) {
      const C = L({ S: '#D9A27A', H: '#6B4A2E', b: '#3E2A18', w: '!#FFFFFF', i: '!#3E8C4A', n: '#C48C64', m: '#7A3E2E', T: '!#3D7BD9',
        G: '#4E7A35', g: '#3A5E27', L: '#7FB24A', r: '!#D6303A', U: '#D8CBA8', u: '#B8A880', B: '#6B4A2A', Y: '!#E8C24A', A: '#8A6B44' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        HSSTTSSH
        HbbSSbbH
        HwiSSiwH
        HSSnnSSH
        HHHmmHHH
        HHHHHHHH`, C);
      hairLong(K, C.H);
      K.fill('head', (f, x, y, i) => (f === 'bottom' || f === 'top' ? null : y === 1 ? (K.rand(i.gx, i.gy, 8) < .45 ? C.L : C.G) : y === 0 ? (i.gx % 3 === 0 ? (i.gx % 2 ? C.r : C.g) : null) : null), 'o');
      K.fill('head', (f, x, y) => (x === 0 || x === 7 || y === 0 || y === 7 ? (x + y) % 2 ? C.L : C.G : null), 'o', ['top']);
      K.fill('body', cloth(C.U, .01));
      K.map('body', 'front', `
        UUUHHUUU
        UUUHHUUU
        UUUHHUUU
        UUUYYUUU
        UUUUUUUU
        UUUUUUUU
        UUUUUUUU
        uuuuuuuu
        UUUUUYUU
        UUUUUUYU
        UUUUUYUU
        uuuuuuuu`, C);
      K.fill('body', (f, x, y) => (y === 7 ? sh(C.u, FS[f]) : null), 'b', ['right', 'left', 'back']);
      K.fill('body', (f, x, y, i) => (f === 'top' || f === 'bottom' ? null : f === 'front' ? (x === 0 || x === 7 ? C.G : null) : (K.rand(i.gx, i.gy, 3) < .1 ? C.L : sh(C.G, FS[f] - .01 * y))), 'o');
      arms(K, { sleeve: C.G, skin: C.S, len: 10, cuff: C.g });
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f !== 'top' && f !== 'bottom' && y < 9 && K.rand(i.gx, i.gy, 12) < .12 ? C.L : null)));
      legs(K, { pants: C.U, shoe: C.B, shoeH: 3, shoeTop: true });
      K.both('leg', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && y === 10 && (x % 2) ? C.A : null)));
      return .04;
    },
  });

  add({
    id: 'alquimista', name: 'Alquimista', cat: 'Magia', slim: false,
    desc: 'Óculos de latão na testa, avental chamuscado e um cinto cheio de frascos.',
    paint(K) {
      const C = L({ S: '#EDBB94', H: '#D8D8D0', h: '#A8A8A0', w: '!#FFFFFF', i: '!#6B3FA0', n: '#D9A47C', m: '#9A5A48', d: '#7A6A62',
        G: '#C9963A', g: '!#7FE0FF', B: '#3A2614', T: '#2E6E6A', t: '#4E9590', A: '#7A5230', a: '#5A3A20', r: '!#E33B3B', e: '!#5CF07A', p: '!#C77DFF', K: '#2A2420' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        HSSSSSSH
        ShhSShhS
        SwiSSiwS
        SdSnnSSS
        SSSmmSSS
        SSSSSSSS`, C);
      hairShort(K, C.H);
      K.fill('head', (f, x, y, i) => (f === 'top' ? (K.rand(i.gx, i.gy, 2) < .4 ? C.H : null) : f === 'bottom' ? null : y === 2 ? C.B : y <= 1 && K.rand(i.gx, i.gy, 2) < .3 ? C.H : null), 'o');
      K.map('head', 'front', `
        H..H..H.
        BGgGGgGB
        BGGBBGGB`, C, 'o');
      K.fill('body', cloth(C.T, .01));
      K.map('body', 'front', `
        TTTSSTTT
        TTTTTTTT`, C);
      K.map('body', 'front', `
        .A....A.
        .AAAAAA.
        .AAAAAA.
        .AAAaAA.
        .AAAAAA.
        .AaAAAA.
        .AAAAAA.
        aaaaaaaa
        .r.e..p.
        .r.e..p.
        .AAAaAA.
        .aaaaaa.`, C, 'o');
      K.fill('body', (f, x, y) => (y === 7 ? C.a : null), 'o', ['right', 'left', 'back']);
      K.map('body', 'back', `
        .A....A.
        ..A..A..
        ...AA...
        ..A..A..
        .A....A.`, C, 'o');
      arms(K, { sleeve: C.T, skin: C.S, len: 5, cuff: C.t });
      K.both('arm', p => K.fill(p, (f, x, y) => (f === 'bottom' ? C.a : f !== 'top' && y >= 9 ? sh(C.A, FS[f]) : null)));
      legs(K, { pants: C.K, shoe: C.B, shoeH: 4, shoeTop: true });
      return .04;
    },
  });

  add({
    id: 'rei', name: 'Rei Aurélio', cat: 'Realeza', slim: false,
    desc: 'Coroa cravejada, manto de veludo com arminho e corrente de ouro.',
    paint(K) {
      const C = L({ S: '#E3B08A', H: '#6B4A2E', w: '!#FFFFFF', i: '!#3D6BB0', n: '#CF9A72', m: '#7A3A2E',
        G: '#E8BE3C', g: '#B88C1C', r: '!#E0263A', b: '!#2D6BE0', V: '#9E1B2A', v: '#741320', E: '#F4F1EA', k: '!#1A1A1A', N: '#24305E', Y: '!#FFD84A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        HSSSSSSH
        SHHSSHHS
        SwiSSiwS
        HSSnnSSH
        HHHmmHHH
        HHHHHHHH`, C);
      hairShort(K, C.H, { long: true });
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? null : f === 'top' ? (x === 3 || x === 4 || y === 3 || y === 4 ? C.G : C.V) : y === 0 ? (x % 2 === 0 ? C.G : null) : y === 1 ? (x % 4 === 1 ? (i.gx % 2 ? C.b : C.r) : C.G) : y === 2 ? C.g : null), 'o');
      K.map('head', 'front', `
        G..GG..G
        GGGrrGGG
        ggbggbgg`, C, 'o');
      K.px('head', 'top', 3, 3, C.Y, 'o');
      K.fill('body', cloth(C.N, .01));
      K.map('body', 'front', `
        NNNNNNNN
        NNNNNNNN
        NNGNNGNN
        NNNGGNNN
        NNNYYNNN
        NNNNNNNN
        NNNNNNNN
        GGGGGGGG
        NNNNNNNN
        NNNGNNNN
        NNNNNNNN
        GGGGGGGG`, C);
      const erm = ermine(C.E, C.k);
      K.fill('body', (f, x, y, i) => {
        if (f === 'top' || f === 'bottom') return null;
        if (y <= 1) return erm(f, x, y, i);
        if (f === 'front') return x === 0 || x === 7 ? C.V : x === 1 || x === 6 ? erm(f, x, y, i) : null;
        return sh(C.V, FS[f] - .01 * y);
      }, 'o');
      K.both('arm', p => K.fill(p, (f, x, y, i) => {
        if (f === 'top') return C.V; if (f === 'bottom') return sh(C.S, -.12);
        if (y >= 10) return f === 'front' && y === 10 && i.ox === 1 ? C.Y : sh(C.S, FS[f]);
        if (y >= 8) return erm(f, x, y, i);
        return sh(C.V, FS[f] - .01 * y);
      }));
      legs(K, { pants: C.N, shoe: C.v, shoeH: 2 });
      K.both('leg', p => K.fill(p, (f, x, y, i) => (i.outer && x === 2 && y < 10 ? C.G : null)));
      return .03;
    },
  });

  add({
    id: 'rainha', name: 'Rainha Isolda', cat: 'Realeza', slim: true,
    desc: 'Tiara de rubi, longos cabelos dourados e vestido violeta bordado.',
    paint(K) {
      const C = L({ S: '#F2CDB0', H: '#E8C46A', h: '#C99B3C', w: '!#FFFFFF', i: '!#2D6BE0', k: '#7A5A2A', n: '#E3BC9C', l: '#C4505A', p: '#F2A5A0',
        G: '#E8BE3C', g: '#B88C1C', r: '!#E0263A', P: '#5B2A86', Q: '#45206A', W: '!#F4F1EA' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHhHH
        HSSSSSHH
        SkkSSkkS
        SwiSSiwS
        SpSnnSpS
        SSSllSSS
        SSSSSSSS`, C);
      hairLong(K, C.H);
      K.fill('head', (f, x, y) => (f === 'top' || f === 'bottom' ? null : y === 1 ? C.G : null), 'o');
      K.map('head', 'front', `
        .G.rr.G.
        GGGGGGGG`, C, 'o');
      K.fill('body', cloth(C.P, .01));
      K.map('body', 'front', `
        PSSSSSSP
        PPSWWSPP
        PPPWrPPP
        PGPPPPGP
        PPGPPGPP
        PPPGGPPP
        PPPGGPPP
        PPPPPPPP
        GGGGGGGG
        PPPPPPPP
        PPPQPPPP
        QQQQQQQQ`, C);
      K.fill('body', (f, x, y) => (y === 8 ? C.G : null), 'b', ['right', 'left', 'back']);
      K.fill('body', (f, x, y, i) => (y <= 6 && x >= 1 && x <= 6 - Math.max(0, y - 3) && x >= 1 + Math.max(0, y - 3) ? K.hair(C.H)(f, x, y, i) : null), 'o', ['back']);
      K.map('head', 'back', `
        ........
        GGGGGGGG`, C, 'o');
      arms(K, { sleeve: C.P, skin: C.S, len: 10, cuff: C.G });
      K.both('leg', p => K.fill(p, (f, x, y) => (f === 'top' ? C.P : f === 'bottom' ? C.g : y === 11 ? sh(C.G, FS[f]) : y === 10 ? sh(C.Q, FS[f]) : sh(C.P, FS[f] - .01 * y))));
      return .03;
    },
  });

  add({
    id: 'bobo', name: 'Bobo da Corte', cat: 'Realeza', slim: false,
    desc: 'Roupa em quartos vermelho e amarelo, gola de babados e guizos dourados.',
    paint(K) {
      const C = L({ S: '#F2D2B8', R: '#C8302C', r: '#9C2420', Y: '#F2C230', y: '#C99A12', w: '!#FFFFFF', i: '!#2B2B2B', p: '!#E8707A',
        m: '#8E3A3A', B: '!#F2CF4A', W: '#F4F4F2', n: '#E3BC9C', k: '!#1A1A1A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        RRRRYYYY
        RRRRYYYY
        SSSSSSSS
        SYSSSSRS
        SwiSSiwS
        SpSnnSpS
        SmSSSSmS
        SSmmmmSS`, C);
      const half = (f, x, y) => {
        if (f === 'right') return C.R; if (f === 'left') return C.Y;
        if (f === 'front' || f === 'top') return x < 4 ? C.R : C.Y;
        return x < 4 ? C.Y : C.R;
      };
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : f === 'top' || y <= 1 ? sh(half(f, x, y), FS[f]) : null), 'b', ['top', 'right', 'left', 'back']);
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : f === 'top' || y <= 1 ? sh(half(f, x, y), FS[f]) : y === 2 ? (x % 2 ? sh(half(f, x, y), -.2) : null) : null), 'o');
      for (const f of ['right', 'left']) K.map('head', f, `
        ........
        ........
        ........
        ...BB...
        ...BB...`, C, 'o');
      K.fill('body', (f, x, y) => sh(half(f, x, y), FS[f] - (f === 'top' || f === 'bottom' ? 0 : .01 * y)));
      K.map('body', 'front', `
        ........
        ........
        ........
        ...B....
        ........
        ........
        ....B...
        ........
        ........
        ...B....
        ........
        ........`, C);
      K.map('body', 'front', `
        WWWWWWWW
        .W.WW.W.`, C, 'o');
      K.map('body', 'back', `
        WWWWWWWW
        .W.WW.W.`, C, 'o');
      K.fill('body', (f, x, y) => (y === 0 ? C.W : null), 'o', ['right', 'left']);
      const armC = { rarm: C.Y, larm: C.R, rleg: C.Y, lleg: C.R };
      K.both('arm', p => K.fill(p, (f, x, y) => (f === 'bottom' ? sh(C.S, -.12) : y >= 10 ? sh(C.S, FS[f]) : y === 9 ? C.W : sh(armC[p], FS[f] - .01 * y))));
      K.both('leg', p => K.fill(p, (f, x, y) => (f === 'bottom' ? C.k : y >= 10 ? (f === 'front' && y === 10 && x === 1 ? C.B : sh(armC[p === 'rleg' ? 'larm' : 'rarm'], FS[f] - .15)) : sh(armC[p], FS[f] - .01 * y))));
      return .03;
    },
  });

  add({
    id: 'bardo', name: 'Bardo Andarilho', cat: 'Realeza', slim: false,
    desc: 'Gorro com pena vermelha, gibão vinho e o alaúde pendurado nas costas.',
    paint(K) {
      const C = L({ S: '#EDBB94', H: '#D9A441', h: '#B8862C', w: '!#FFFFFF', i: '!#3E8C4A', n: '#D9A47C', m: '#9A5A48', b: '#A8762A',
        V: '#7A1F3A', v: '#5A1528', W: '#F2EEE4', G: '#E3B83C', T: '#2E6B3A', t: '#22512C', A: '#B07A3A', a: '#7A5228', k: '!#2A1A10', R: '!#D63B3B', F: '!#F2F2F2', B: '#5A3A20' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        TTTTTTTT
        HHHHHHHH
        HSSSSSSH
        SbbSSbbS
        SwiSSiwS
        SSSnnSSS
        SSSmmSSS
        SSSHHSSS`, C);
      hairShort(K, C.H, { long: true });
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : f === 'top' ? C.T : y === 0 ? sh(C.T, FS[f]) : y === 1 ? C.t : null), 'o');
      K.map('head', 'left', `
        TTRRRRRF
        ttttRRFF
        ......F.`, C, 'o');
      K.fill('body', cloth(C.V, .01));
      K.fill('body', (f, x, y) => {
        if (f !== 'front' && f !== 'back') return null;
        const sx = f === 'front' ? 7 - Math.floor(y * 7 / 11) : Math.floor(y * 7 / 11);
        return x === sx ? C.a : null;
      });
      K.map('body', 'front', `
        VVWWWWVV
        VVVWWVVV
        VG.G..GV
        VG....GV
        VG.G..GV
        VG....GV
        VG.G..GV
        VG....GV
        VG.G..GV
        VG....GV
        VVVVVVVV
        vvvvvvvv`, C);
      K.map('body', 'back', `
        .....aa.
        .....a..
        ....aa..
        ....a...
        ...aa...
        ..AAAA..
        .AAAAAA.
        .AAkkAA.
        .AAkkAA.
        .AAAAAA.
        ..AAAA..
        ...aa...`, C, 'o');
      K.both('arm', p => K.fill(p, (f, x, y, i) => {
        if (f === 'top') return C.V; if (f === 'bottom') return sh(C.S, -.12);
        if (y >= 10) return sh(C.S, FS[f]); if (y === 9) return C.W;
        if (y <= 4) return sh((x % 2 && f !== 'top') ? C.G : C.V, FS[f]);
        return sh(C.V, FS[f] - .01 * y);
      }));
      legs(K, { pants: C.T, shoe: C.B, shoeH: 5, shoeTop: true });
      return .04;
    },
  });

  add({
    id: 'ferreiro', name: 'Ferreiro da Vila', cat: 'Povo', slim: false,
    desc: 'Careca reluzente, barba cerrada, avental de couro e braços de quem bate ferro.',
    paint(K) {
      const C = L({ S: '#B57C55', s: '#9A6644', l: '#C99470', K: '#2A1C14', w: '!#FFFFFF', i: '!#3A2414', n: '#A66E4A', m: '#6B3A28', d: '#5A4A40',
        G: '#4A4A50', A: '#7A4E2A', a: '#5A3820', B: '#2A2420', b: '#3A2C24', Y: '!#C9CDD2' });
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? sh(C.S, -.18) : f === 'top' ? ((x === 3 || x === 4) && (y === 3 || y === 4) ? C.l : C.S) : (i.fd >= 3 && y >= 2 && y <= 4) || (f === 'back' && y >= 2 && y <= 5) ? C.s : C.S));
      K.map('head', 'front', `
        SSSSSSSS
        SSSllSSS
        SSSSSSSS
        SKKSSKKS
        SwiSSiwS
        SdSnnSSS
        SKKmmKKS
        SKKKKKKS`, C);
      K.fill('head', (f, x, y, i) => (i.fd <= 2 && y >= 5 ? C.K : null), 'b', ['right', 'left']);
      K.fill('body', cloth(C.G, .01));
      K.map('body', 'front', `
        .A....A.
        .AAAAAA.
        .AAAAAA.
        .AAAAAA.
        .AAAdAA.
        .AAAAAA.
        .AAAAAA.
        .aaaaaa.
        .aAAAYa.
        .aAAAYa.
        .aaaaaa.
        .AAAAAA.`, C, 'o');
      K.map('body', 'back', `
        .A....A.
        ..A..A..
        ...AA...
        ..A..A..
        .A....A.`, C, 'o');
      K.both('arm', p => K.fill(p, (f, x, y, i) => {
        if (f === 'top') return C.G; if (f === 'bottom') return C.a;
        if (y >= 8) return sh(y === 8 ? C.a : C.A, FS[f]);
        if (y === 0) return sh(C.G, FS[f]);
        if (f === 'front' && i.ox === 1 && y >= 2 && y <= 4) return C.l;
        if (K.rand(i.gx, i.gy, 5) < .08) return C.d;
        return sh(i.inner ? C.s : C.S, FS[f]);
      }));
      legs(K, { pants: C.b, shoe: C.B, shoeH: 3, shoeTop: true });
      return .05;
    },
  });

  add({
    id: 'camponesa', name: 'Camponesa', cat: 'Povo', slim: true,
    desc: 'Lenço na cabeça, trança comprida, corpete de cordões e avental de linho.',
    paint(K) {
      const C = L({ S: '#F0C3A0', H: '#6B4A2E', w: '!#FFFFFF', i: '!#3D7BC2', n: '#E0AE8A', m: '#C4665A', p: '#EAA08A', k: '#4A2E1A',
        W: '#EDE6D6', g: '#D2C8B2', R: '#9C4A2E', r: '#7A3820', A: '#E8DFC8', a: '#CFC4AA', B: '#5A3A20', b: '#4E7AB0', t: '#B83A3A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        WWWWWWWW
        HHHHHHHH
        HSSSSSSH
        SkkSSkkS
        SwiSSiwS
        SpSnnSpS
        SSSmmSSS
        SSSSSSSS`, C);
      hairShort(K, C.H, { long: true });
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? null : f === 'top' ? ((i.gx + i.gy) % 4 === 0 ? C.b : C.W) : y <= 1 ? sh((i.gx + y) % 4 === 0 ? C.b : C.W, FS[f]) : null), 'o');
      K.map('head', 'back', `
        ........
        ........
        ...WW...
        ..W..W..
        ...HH...
        ...HH...
        ...HH...
        ...HH...`, C, 'o');
      K.fill('body', cloth(C.R, .01));
      K.map('body', 'front', `
        WWSSSSWW
        WWWWWWWW
        RRkRRkRR
        RRRkkRRR
        RRkRRkRR
        RRRkkRRR
        RRkRRkRR
        rrrrrrrr`, C);
      K.fill('body', (f, x, y) => (y <= 1 ? sh(C.W, FS[f]) : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'front', `
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        aaaaaaaa
        .AAAAAA.
        .AAAAAA.
        .AAAAAA.
        .aaaaaa.`, C, 'o');
      K.map('body', 'back', `
        ...HH...
        ...HH...
        ...HH...
        ...HH...
        ...tt...
        ...HH...`, C, 'o');
      arms(K, { sleeve: C.W, skin: C.S, len: 6, cuff: C.g });
      K.both('leg', p => K.fill(p, (f, x, y) => (f === 'top' ? C.R : f === 'bottom' ? C.B : y >= 10 ? sh(C.B, FS[f]) : y === 9 ? sh(C.r, FS[f]) : sh(C.R, FS[f] - .01 * y))));
      return .04;
    },
  });

  add({
    id: 'monge', name: 'Irmão Bento', cat: 'Povo', slim: false,
    desc: 'Hábito de lã marrom, tonsura de monge, cordão na cintura e um terço de madeira.',
    paint(K) {
      const C = L({ S: '#E3B08A', H: '#6B4A2E', w: '!#FFFFFF', i: '!#5A3A1E', n: '#CF9A72', m: '#9A5A48', b: '#4A3020',
        U: '#6B4A30', u: '#553A24', R: '#E3D2A6', W: '#A87A4A', B: '#4A3020' });
      skinHead(K, C.S);
      const hc = K.hair(C.H);
      K.fill('head', (f, x, y, i) => (x === 0 || x === 7 || y === 0 || y === 7 ? hc(f, x, y, i) : null), 'b', ['top']);
      K.fill('head', (f, x, y, i) => (y <= 2 || (f === 'back' && y <= 4) || (i.fd >= 4 && y <= 4) ? hc(f, x, y, i) : null), 'b', ['right', 'left', 'back']);
      K.map('head', 'front', `
        HHHHHHHH
        HSSSSSSH
        SSSSSSSS
        SbbSSbbS
        SwiSSiwS
        SSSnnSSS
        SSSmmSSS
        SSSSSSSS`, C);
      const habit = (f, x, y, i) => sh(i.a >= 0 && i.a % 3 === 2 ? C.u : C.U, FS[f] - (f === 'top' || f === 'bottom' ? 0 : .01 * y));
      K.fill('body', habit);
      K.map('body', 'front', `
        UUSSSSUU
        UWUUUUWU
        UUWUUWUU
        UUUWWUUU
        UUUWWUUU
        ........
        ........
        RRRRRRRR
        ..R.....
        ..R.....
        ..R.....
        ........`, C);
      K.fill('body', (f, x, y) => (y === 7 ? sh(C.R, FS[f]) : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'back', `
        .uUUUUu.
        .uUUUUu.
        ..uUUu..
        ...uu...`, C, 'o');
      K.map('body', 'front', `UU....UU`, C, 'o');
      K.both('arm', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? sh(C.S, -.12) : y >= 10 ? sh(C.S, FS[f]) : y === 9 ? sh(C.u, FS[f]) : habit(f, x, y, i))));
      K.both('leg', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.B : y === 11 ? sh(C.B, FS[f]) : y === 10 ? ((x + y) % 2 ? sh(C.S, FS[f]) : C.B) : habit(f, x, y, i))));
      return .04;
    },
  });

  add({
    id: 'taberneiro', name: 'Taberneiro Bruno', cat: 'Povo', slim: false,
    desc: 'Bigodão, nariz corado, colete verde e avental comprido de quem serve hidromel.',
    paint(K) {
      const C = L({ S: '#E8AE88', H: '#1E1A18', w: '!#FFFFFF', i: '!#4A3020', N: '#D97A6A', m: '#8E4A3A', M: '#2A2420',
        W: '#F0EDE6', g: '#D2CEC4', V: '#3A6B3A', v: '#2A522A', A: '#F4F2EC', a: '#DAD6CC', B: '#4A3020', P: '#5A4636', R: '#B8443A', Y: '!#C9A04A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        HSSSSSSH
        SHHSSHHS
        SwiSSiwS
        SSSNNSSS
        SMMMMMMS
        SMSmmSMS`, C);
      hairShort(K, C.H);
      K.fill('head', (f, x, y, i) => (f === 'top' ? (K.rand(i.gx, i.gy, 4) < .3 ? C.H : null) : f !== 'bottom' && y <= 1 && K.rand(i.gx, i.gy, 4) < .25 ? C.H : null), 'o');
      K.fill('body', cloth(C.W, .01));
      K.map('body', 'front', `WWWSSWWW`, C);
      K.fill('body', (f, x, y) => {
        if (f === 'top' || f === 'bottom' || y > 7) return null;
        if (f === 'front') return x <= 1 || x >= 6 ? (x === 1 && y % 2 === 1 ? C.Y : C.V) : null;
        return sh(C.V, FS[f]);
      }, 'o');
      K.map('body', 'front', `
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        aaaaaaaa
        .AAAAAA.
        .AAAAAA.
        .AAAAAA.
        .aaaaaa.`, C, 'o');
      arms(K, { sleeve: C.W, skin: C.S, len: 6, cuff: C.g });
      K.fill('rarm', (f, x, y) => (f === 'top' ? C.W : f === 'bottom' ? null : y <= 1 ? ((x + y) % 2 ? C.R : C.W) : null), 'o');
      legs(K, { pants: C.P, shoe: C.B, shoeH: 3, shoeTop: true });
      return .04;
    },
  });

  add({
    id: 'cavaleiro-negro', name: 'Cavaleiro Negro', cat: 'Sombras', slim: false,
    desc: 'Aço escurecido, olhos em brasa atrás da viseira e capa cor de sangue.',
    paint(K) {
      const C = L({ K: '#2E3038', k: '#1E1F25', D: '#14151A', l: '#55596A', g: '#767C8C', R: '!#FF2A2A', r: '!#A0101A', C: '#7A1420', c: '#55101A' });
      const steel = (f, x, y, i) => (f === 'top' ? C.l : f === 'bottom' ? C.D : K.rand(i.gx, i.gy, 7) < .1 ? C.l : sh(C.K, FS[f] - .01 * y));
      K.fill('head', steel);
      K.map('head', 'front', `
        kkkkkkkk
        kkkkkkkk
        kkkkkkkk
        kkkkkkkk
        kRRkkRRk
        kkkkkkkk
        kkkkkkkk
        kkkkkkkk`, C);
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? null : f === 'top' ? (x === 3 || x === 4 ? C.g : C.K) : y === 0 ? C.l : steel(f, x, y, i)), 'o');
      K.map('head', 'front', `
        llllllll
        KKKggKKK
        KKKggKKK
        DDDggDDD
        DrRDDRrD
        KKKggKKK
        KDKggKDK
        kkkkkkkk`, C, 'o');
      K.fill('body', steel);
      K.fill('body', (f, x) => (x > 0 && x < 7 ? C.D : null), 'o', ['front']);
      K.map('body', 'front', `
        g......g
        .DDDDDD.
        .CDDDDC.
        .DCDDCD.
        .DDCCDD.
        .DDDDDD.
        .DDDDDD.
        kkkRRkkk
        .DDDDDD.
        .DDDDDD.
        .DDDDDD.
        .cccccc.`, C, 'o');
      K.fill('body', (f, x, y) => (x % 3 === 1 ? C.c : C.C), 'o', ['back']);
      K.map('body', 'back', `g......g`, C, 'o');
      K.fill('body', (f, x, y) => (y === 7 ? C.k : null), 'o', ['right', 'left']);
      K.both('arm', p => {
        K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.D : steel(f, x, y, i)));
        K.fill(p, (f, x, y, i) => (f === 'top' ? C.g : f === 'bottom' ? null : y <= 3 ? (y === 0 ? C.g : y === 3 ? C.D : (x + y) % 3 === 0 ? C.g : C.l) : y >= 9 ? sh(C.k, FS[f]) : null), 'o');
      });
      K.both('leg', p => K.fill(p, (f, x, y, i) => (f === 'bottom' ? C.D : y === 5 ? C.g : y >= 10 ? sh(C.D, FS[f]) : steel(f, x, y, i))));
      return .04;
    },
  });

  add({
    id: 'necromante', name: 'Necromante', cat: 'Sombras', slim: false,
    desc: 'Capuz sem rosto, olhos violeta, máscara de osso e runas que brilham no manto.',
    paint(K) {
      const C = L({ H: '#2A2333', h: '#1E1826', D: '!#0E0B12', P: '!#C77DFF', p: '!#8E3FD6', B: '#E6E0CC', b: '#B8B09A', R: '#3B2A4A', r: '#2C1F38', k: '!#0A080C' });
      K.fill('head', (f) => (f === 'bottom' ? C.h : sh(C.H, FS[f])));
      K.map('head', 'front', `
        HHHHHHHH
        HDDDDDDH
        DDDDDDDD
        DPDDDDPD
        DpPDDPpD
        DDDDDDDD
        DBbBBbBD
        DbBbbBbD`, C);
      K.fill('head', (f, x, y) => (f === 'bottom' ? null : sh(C.H, FS[f])), 'o', ['top', 'bottom', 'right', 'left', 'back']);
      K.map('head', 'front', `
        HHHHHHHH
        HhhhhhhH
        H......H
        H......H
        H......H
        H......H
        H......H
        h......h`, C, 'o');
      const robe = (f, x, y) => sh(C.R, FS[f] - (f === 'top' || f === 'bottom' ? 0 : .012 * y));
      K.fill('body', robe);
      K.map('body', 'front', `
        hRRRRRRh
        hRRRRRRh
        RRRBBRRR
        RRRbbRRR
        RRRRRRRR
        RPRRRRPR
        RpRRRRpR
        kkkBBkkk
        RRRkkRRR
        RPRRRRPR
        RpRRRRpR
        rRrRrRrR`, C);
      K.fill('body', (f, x, y) => (y === 7 ? C.k : y === 11 ? ((x + y) % 2 ? C.r : C.R) : null), 'b', ['right', 'left', 'back']);
      K.map('body', 'back', `
        .hHHHHh.
        .hHHHHh.
        ..hHHh..
        ...hh...
        ........
        ...PP...
        ..P..P..
        ...PP...`, C, 'o');
      K.both('arm', p => K.fill(p, (f, x, y) => (f === 'bottom' ? C.b : y >= 10 ? (x % 2 ? C.B : C.k) : y === 9 ? C.p : robe(f, x, y))));
      K.both('leg', p => K.fill(p, (f, x, y) => (f === 'bottom' ? C.k : y >= 9 ? (y === 9 && x % 2 ? C.r : C.k) : robe(f, x, y))));
      return .04;
    },
  });

  add({
    id: 'ladino', name: 'Ladino Encapuzado', cat: 'Sombras', slim: false,
    desc: 'Capuz e máscara de pano, couro com tiras cruzadas e duas adagas no cinto.',
    paint(K) {
      const C = L({ H: '#3A3A40', h: '#26262C', S: '#C98A5E', w: '!#E8E8E8', i: '!#7A5A2A', b: '#3A2414', M: '#2E2E34', A: '#6B4A2E', a: '#4E3420', B: '#2A2420', Y: '!#C9CDD2', G: '#B8963A' });
      skinHead(K, C.S);
      K.map('head', 'front', `
        HHHHHHHH
        HHHHHHHH
        HhhhhhhH
        SbbSSbbS
        SwiSSiwS
        MMMMMMMM
        MMMMMMMM
        MMMMMMMM`, C);
      K.fill('head', (f, x, y) => (f === 'top' || f === 'bottom' ? null : y >= 5 ? sh(C.M, FS[f]) : sh(C.H, FS[f])), 'b', ['top', 'right', 'left', 'back']);
      K.fill('head', C.H, 'b', ['top']);
      K.fill('head', (f, x, y, i) => (f === 'bottom' ? null : K.rand(i.gx, i.gy, 9) < .12 ? C.h : sh(C.H, FS[f])), 'o', ['top', 'right', 'left', 'back']);
      K.map('head', 'front', `
        HHHHHHHH
        HH....HH
        H......H
        H......H
        H......H
        h......h`, C, 'o');
      K.fill('body', (f, x, y) => {
        if (f === 'top' || f === 'bottom') return sh(C.A, FS[f]);
        if (f === 'front' && y >= 1 && y <= 7 && (x === y - 1 || x === 8 - y)) return C.a;
        if (y === 8) return sh(C.B, FS[f]);
        return sh(C.A, FS[f] - .01 * y);
      });
      K.map('body', 'front', `
        MMMMMMMM
        ........
        ........
        ........
        ........
        ........
        ........
        ........
        BGBBBBGB
        .Y....Y.
        .Y....Y.
        ........`, C);
      K.fill('body', (f, x, y, i) => (f === 'top' || f === 'bottom' || f === 'front' ? null : y <= 10 ? sh(C.H, FS[f] - .02) : null), 'o');
      K.both('arm', p => K.fill(p, (f, x, y) => (f === 'top' ? C.M : f === 'bottom' ? C.h : y >= 10 ? sh(C.h, FS[f]) : y >= 6 ? sh(y % 2 ? C.a : C.A, FS[f]) : sh(C.M, FS[f]))));
      legs(K, { pants: C.M, shoe: C.A, shoeH: 5, shoeTop: true, sole: C.B });
      K.both('leg', p => K.fill(p, (f, x, y) => (f !== 'top' && f !== 'bottom' && (y === 8 || y === 10) ? C.a : null)));
      return .04;
    },
  });

  const CATS = ['Guerreiros', 'Magia', 'Realeza', 'Povo', 'Sombras', 'Extras'];
  SKINS.sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat));

  /* ---------------- starting points ---------------- */
  const TEMPLATES = {
    manequim: {
      id: 'manequim', name: 'Manequim', slim: false,
      paint(K) {
        const C = L({ S: '#E0AC7E', H: '#4A3020', b: '#3A2416', w: '!#FFFFFF', i: '!#3B6FB0', n: '#CF9A6E', m: '#9A5A48', T: '#E3D9C2', t: '#C7BA9C', J: '#6B5038', B: '#3A2A1C' });
        skinHead(K, C.S);
        K.map('head', 'front', `
          HHHHHHHH
          HHHHHHHH
          HSSSSSSH
          SbbSSbbS
          SwiSSiwS
          SSSnnSSS
          SSSmmSSS
          SSSSSSSS`, C);
        hairShort(K, C.H);
        torso(K, C.T);
        K.map('body', 'front', `TTTttTTT`, C);
        arms(K, { sleeve: C.T, skin: C.S, len: 4, cuff: C.t });
        legs(K, { pants: C.J, shoe: C.B, shoeH: 2 });
        return .03;
      },
    },
  };

  function build(def) {
    const K = Kit(def.slim, [...def.id].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7));
    const amp = def.paint(K);
    K.finish(amp ?? .04);
    return K.t;
  }

  return { PARTS, MIRROR, FACES, CATS, faceRects, partDims, partRects, texelMap, SKINS, TEMPLATES, build };
})();

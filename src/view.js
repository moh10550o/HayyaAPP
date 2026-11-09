/* ================= View: layout, phases, countdown styles, name, ticker, gallery, saver ================= */
const hexA = (hex, a) => { const h = (hex || '#000').replace('#', ''); const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h; const n = parseInt(f, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
const lum = hex => { const h = (hex || '#000').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const setText = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const allTpls = () => TEMPLATES.concat((S.userTpls || []).filter(t => t && t.id).map(t => Object.assign({ en: t.ar, card: 'glass', art: 'star8', s: t.p, user: true }, t)));
const tplById = id => allTpls().find(t => t.id === id);
const tpl = () => tplById(activeTplId()) || tplById(S.design.tpl) || TEMPLATES[0];
/* colour used to paint a single-colour logo: original = keep the picture as it is */
function tintColor(mode, custom) {
  const c = colors(), t = tpl();
  if (mode === 'theme') return c.p;
  if (mode === 'secondary') return c.s;
  if (mode === 'text') return S.name.color || c.p;
  if (mode === 'auto') return (lum(t.bg1) > .4 && !S.design.bgImg) ? '#1b1b1b' : '#ffffff';   // contrast with the background
  if (mode === 'custom') return custom || '#ffffff';
  return '';
}
/* country flag as an <img> (a data URL, so several copies never clash) */
const flagUrl = code => { if (typeof FLAGS === 'undefined' || !FLAGS[code]) return ''; const v = FLAGS[code]; return v.indexOf('data:') === 0 ? v : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(v); };
const flagOn = pos => { const F = S.flag || {}; return !!(F.code && flagUrl(F.code) && (!pos || F.pos === pos || (pos === 'name' && /^name/.test(F.pos)) || (pos === 'corner' && /^corner/.test(F.pos)))); };
function flagImg(cls, h) {
  const F = S.flag; const url = flagUrl(F.code); if (!url) return '';
  const name = (typeof FLAG_NAMES !== 'undefined' && FLAG_NAMES[F.code]) ? FLAG_NAMES[F.code][S.lang === 'ar' ? 0 : 1] : F.code;
  return `<img class="flag ${cls} fs-${F.style || 'shadow'}" src="${url}" alt="${esc(name)}" style="height:${h}"${h ? '' : ''}>`;
}
const FLAG_H = { s: 0.75, m: 1, l: 1.35 };
const maskCss = (url, color) => `background:${color};-webkit-mask:url('${url}') center/contain no-repeat;mask:url('${url}') center/contain no-repeat;`;
const imgSize = url => new Promise(res => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 }); im.onerror = () => res({ w: 1, h: 1 }); im.src = url; });
const colors = () => { const t = tpl(); return S.design.useTplColors ? { p: t.p, s: t.s } : { p: S.design.p || t.p, s: S.design.s || t.s }; };

/* ---------- background art (generated SVG) ---------- */
function artSVG(kind, c, W, H, c2) {
  const enc = s => `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
  const st = hexA(c, .16), st2 = hexA(c, .3);
  let pat = '', frame = '';
  if (kind === 'stars' || kind === 'lantern') {
    pat = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='${st}' stroke-width='2'><rect x='30' y='30' width='60' height='60'/><rect x='30' y='30' width='60' height='60' transform='rotate(45 60 60)'/><circle cx='60' cy='60' r='12'/><path d='M0 0L30 30M120 0L90 30M0 120L30 90M120 120L90 90'/></g></svg>`);
  } else if (kind === 'lattice' || kind === 'arch') {
    pat = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='90' height='156' viewBox='0 0 90 156'><g fill='none' stroke='${st}' stroke-width='1.6'><path d='M45 0L90 26V78L45 104L0 78V26Z'/><path d='M45 104V156M0 26L-45 0M90 26L135 0'/><circle cx='45' cy='52' r='10'/></g></svg>`);
  } else if (kind === 'dome') {
    pat = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g fill='none' stroke='${st}' stroke-width='1.6'><circle cx='80' cy='80' r='50'/><circle cx='0' cy='0' r='50'/><circle cx='160' cy='0' r='50'/><circle cx='0' cy='160' r='50'/><circle cx='160' cy='160' r='50'/></g></svg>`);
  }
  if (kind === 'arch') {
    const m = 26, aw = W - 2 * m, top = H * 0.16;
    frame = `<svg class="frame" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="M${m} ${H - m} V${top + 120} Q${m} ${top} ${W / 2} ${m} Q${W - m} ${top} ${W - m} ${top + 120} V${H - m}" fill="none" stroke="${st2}" stroke-width="6"/><path d="M${m + 22} ${H - m} V${top + 135} Q${m + 22} ${top + 20} ${W / 2} ${m + 26} Q${W - m - 22} ${top + 20} ${W - m - 22} ${top + 135} V${H - m}" fill="none" stroke="${st}" stroke-width="3"/></svg>`;
  } else if (kind === 'dome') {
    const b = H - 76, s = Math.min(W, H) / 1080;
    const x = W / 2, d = 210 * s;
    frame = `<svg class="frame" viewBox="0 0 ${W} ${H}"><g fill="${hexA(c, .08)}"><path d="M${x - d} ${b} V${b - 120 * s} Q${x - d} ${b - 330 * s} ${x} ${b - 400 * s} Q${x + d} ${b - 330 * s} ${x + d} ${b - 120 * s} V${b}Z"/><rect x="${x - d - 120 * s}" y="${b - 520 * s}" width="${46 * s}" height="${520 * s}"/><rect x="${x + d + 74 * s}" y="${b - 520 * s}" width="${46 * s}" height="${520 * s}"/><path d="M${x - d - 120 * s} ${b - 520 * s} L${x - d - 97 * s} ${b - 600 * s} L${x - d - 74 * s} ${b - 520 * s}Z M${x + d + 74 * s} ${b - 520 * s} L${x + d + 97 * s} ${b - 600 * s} L${x + d + 120 * s} ${b - 520 * s}Z"/></g></svg>`;
  } else if (kind === 'lantern') {
    const lan = (x, len, sc) => `<g transform="translate(${x} 0) scale(${sc})" fill="none" stroke="${st2}" stroke-width="3"><line x1="0" y1="0" x2="0" y2="${len}"/><path d="M-26 ${len + 20} L0 ${len} L26 ${len + 20} L30 ${len + 90} L0 ${len + 120} L-30 ${len + 90} Z" fill="${hexA(c, .07)}"/><line x1="-26" y1="${len + 20}" x2="26" y2="${len + 20}"/></g>`;
    frame = `<svg class="frame" viewBox="0 0 ${W} ${H}">${lan(W * .08, 120, 1.2)}${lan(W * .16, 60, .9)}${lan(W * .92, 120, 1.2)}${lan(W * .84, 60, .9)}</svg>`;
  }
  const more = artMore(kind, c, W, H, c2 || c);
  if (more) { pat = more.pat || pat; frame = more.frame || frame; }
  return { pat, frame };
}

/* crescent moon: a circle with an offset circle cut out (mask) */
let moonN = 0;
function moonSVG(x, y, R, fill) {
  const id = 'mn' + (++moonN), r1 = v => Math.round(v * 10) / 10;
  return `<mask id="${id}"><rect x="${r1(x - R - 2)}" y="${r1(y - R - 2)}" width="${r1(2 * R + 4)}" height="${r1(2 * R + 4)}" fill="#fff"/><circle cx="${r1(x + R * .42)}" cy="${r1(y - R * .22)}" r="${r1(R * .86)}" fill="#000"/></mask><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(R)}" fill="${fill}" mask="url(#${id})"/>`;
}
/* more Islamic designs: mosque skyline, mihrab arch, arabesque corners, star patterns, mashrabiya, Najdi triangles, rosette, crescent */
function artMore(kind, c, W, H, c2) {
  const enc = s => `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
  const st = hexA(c, .2), st2 = hexA(c, .42), f1 = hexA(c, .12), f2 = hexA(c2, .08);
  const u = Math.min(W, H) / 1080, r1 = v => Math.round(v * 10) / 10;
  const star = (cx, cy, R, r, n) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = Math.PI * i / n - Math.PI / 2, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + r1(cx + q * Math.cos(a)) + ' ' + r1(cy + q * Math.sin(a)); } return d + 'Z'; };
  const tile = (w, h, body) => enc(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`);
  const P = {
    star8: () => tile(110, 110, `<g fill='none' stroke='${st}' stroke-width='1.6'><path d='${star(55, 55, 30, 22, 8)}'/><path d='${star(0, 0, 30, 22, 8)}${star(110, 0, 30, 22, 8)}${star(0, 110, 30, 22, 8)}${star(110, 110, 30, 22, 8)}'/><path d='M30 0H80M0 30V80M110 30V80M30 110H80'/><circle cx='55' cy='55' r='9'/></g>`),
    mash: () => tile(64, 64, `<g fill='none' stroke='${st}' stroke-width='1.4'><path d='M32 4L60 32L32 60L4 32Z'/><path d='${star(32, 32, 13, 7, 8)}'/><path d='M0 0L8 8M64 0L56 8M0 64L8 56M64 64L56 56'/></g>`),
    najdi: () => tile(80, 80, `<g fill='none' stroke='${st}' stroke-width='1.5'><path d='M0 40L40 0L80 40L40 80Z'/><path d='M20 40L40 20L60 40L40 60Z' fill='${hexA(c, .05)}'/></g>`),
    dots: () => tile(220, 220, `<g fill='${hexA(c, .28)}'><circle cx='30' cy='40' r='2'/><circle cx='140' cy='20' r='1.4'/><circle cx='190' cy='110' r='2.2'/><circle cx='80' cy='150' r='1.3'/><circle cx='160' cy='190' r='1.6'/><circle cx='20' cy='200' r='1.2'/></g><path d='${star(100, 90, 5, 2, 4)}' fill='${hexA(c, .35)}'/>`),
    rings: () => tile(140, 140, `<g fill='none' stroke='${st}' stroke-width='1.3'><circle cx='70' cy='70' r='26'/><circle cx='70' cy='70' r='6'/><path d='${star(70, 70, 40, 30, 8)}'/><circle cx='0' cy='0' r='26'/><circle cx='140' cy='0' r='26'/><circle cx='0' cy='140' r='26'/><circle cx='140' cy='140' r='26'/></g>`),
  };
  const svg = body => `<svg class="frame" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  if (kind === 'skyline') {
    // mosque silhouette: central dome, two side domes, four minarets, low wall with arches
    const b = H, cx = W / 2, k = Math.min(W / 1920, 1) * (H > W ? 1.25 : 1);
    const dome = (x, r, dh) => `M${r1(x - r)} ${r1(b)}V${r1(b - dh)}C${r1(x - r)} ${r1(b - dh - r * 1.15)} ${r1(x - r * .12)} ${r1(b - dh - r * 1.2)} ${r1(x)} ${r1(b - dh - r * 1.6)}C${r1(x + r * .12)} ${r1(b - dh - r * 1.2)} ${r1(x + r)} ${r1(b - dh - r * 1.15)} ${r1(x + r)} ${r1(b - dh)}V${r1(b)}Z M${r1(x - 2)} ${r1(b - dh - r * 1.6)}h4v${r1(-r * .35)}h-4Z`;
    const minaret = (x, w, h) => `M${r1(x - w / 2)} ${r1(b)}V${r1(b - h)}H${r1(x + w / 2)}V${r1(b)}Z M${r1(x - w * .85)} ${r1(b - h * .72)}h${r1(w * 1.7)}v${r1(w * .45)}h${r1(-w * 1.7)}Z M${r1(x - w * .7)} ${r1(b - h)}h${r1(w * 1.4)}v${r1(w * .35)}h${r1(-w * 1.4)}Z M${r1(x - w / 2)} ${r1(b - h)}L${r1(x)} ${r1(b - h - w * 2.4)}L${r1(x + w / 2)} ${r1(b - h)}Z`;
    let d = dome(cx, 150 * k, 70 * k) + dome(cx - 300 * k, 82 * k, 48 * k) + dome(cx + 300 * k, 82 * k, 48 * k)
      + minaret(cx - 440 * k, 34 * k, 430 * k) + minaret(cx + 440 * k, 34 * k, 430 * k)
      + minaret(cx - 620 * k, 26 * k, 300 * k) + minaret(cx + 620 * k, 26 * k, 300 * k)
      + `M0 ${r1(b)}V${r1(b - 46 * k)}H${W}V${r1(b)}Z`;
    for (let x = 160 * k; x < W; x += 260 * k) if (Math.abs(x - cx) > 760 * k) d += dome(x, 46 * k, 40 * k);
    return { pat: P.dots(), frame: svg(`<defs><linearGradient id="skg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hexA(c, .3)}"/><stop offset="1" stop-color="${hexA(c, .1)}"/></linearGradient></defs><ellipse cx="${r1(cx)}" cy="${r1(b)}" rx="${r1(W * .6)}" ry="${r1(380 * k)}" fill="${hexA(c2, .1)}"/><path d="${d}" fill="url(#skg)" fill-rule="nonzero"/>${moonSVG(H > W ? W * .86 : W * .92, H > W ? H * .06 : H * .1, 46 * u, hexA(c, .45))}<path d="${star(W * (H > W ? .78 : .86), H * (H > W ? .045 : .07), 10 * u, 4 * u, 5)}" fill="${hexA(c, .3)}"/>`) };
  }
  if (kind === 'mihrab') {
    // pointed (keel) arch with double outline, columns and a hanging lamp at the top
    const m = 30 * u, top = m, spring = H * (H > W ? .3 : .42), x0 = m, x1 = W - m, cx = W / 2;
    const arch = (i) => { const a = x0 + i, z = x1 - i, t = top + i * 1.2, s = spring + i * .4; return `M${r1(a)} ${r1(H - m)}V${r1(s)}C${r1(a)} ${r1(t + (s - t) * .35)} ${r1(cx - (cx - a) * .25)} ${r1(t + 50 * u)} ${r1(cx)} ${r1(t)}C${r1(cx + (z - cx) * .25)} ${r1(t + 50 * u)} ${r1(z)} ${r1(t + (s - t) * .35)} ${r1(z)} ${r1(s)}V${r1(H - m)}`; };
    const col = x => `<rect x="${r1(x - 9 * u)}" y="${r1(spring)}" width="${r1(18 * u)}" height="${r1(H - m - spring)}" fill="${f1}"/><rect x="${r1(x - 18 * u)}" y="${r1(spring - 14 * u)}" width="${r1(36 * u)}" height="${r1(14 * u)}" fill="${hexA(c, .2)}"/>`;
    return { pat: P.mash(), frame: svg(`<path d="${arch(0)}" fill="none" stroke="${st2}" stroke-width="${r1(6 * u)}"/><path d="${arch(24 * u)}" fill="none" stroke="${st}" stroke-width="${r1(2.5 * u)}"/><path d="${arch(40 * u)}" fill="none" stroke="${hexA(c, .1)}" stroke-width="${r1(1.5 * u)}" stroke-dasharray="${r1(3 * u)} ${r1(9 * u)}"/>${col(x0 + 12 * u)}${col(x1 - 12 * u)}<path d="${star(cx, top + 110 * u, 18 * u, 8 * u, 8)}" fill="${hexA(c, .18)}"/>`) };
  }
  if (kind === 'corners') {
    // double border + arabesque ornaments in the four corners
    const S0 = 230 * u, i = 18 * u;
    const orn = `<g fill="none" stroke="${st2}" stroke-width="${r1(2.4 * u)}"><path d="M0 ${r1(S0)}Q0 0 ${r1(S0)} 0"/><path d="M0 ${r1(S0 * .72)}Q${r1(S0 * .08)} ${r1(S0 * .08)} ${r1(S0 * .72)} 0"/><path d="M${r1(S0 * .18)} ${r1(S0 * .62)}Q${r1(S0 * .36)} ${r1(S0 * .36)} ${r1(S0 * .62)} ${r1(S0 * .18)}"/><path d="${star(S0 * .3, S0 * .3, S0 * .13, S0 * .06, 8)}" fill="${hexA(c, .12)}"/><circle cx="${r1(S0 * .3)}" cy="${r1(S0 * .3)}" r="${r1(S0 * .03)}" fill="${hexA(c, .4)}"/><path d="M${r1(S0)} 0q${r1(S0 * .12)} ${r1(S0 * .1)} ${r1(S0 * .26)} 0M0 ${r1(S0)}q${r1(S0 * .1)} ${r1(S0 * .12)} 0 ${r1(S0 * .26)}"/></g>`;
    const at = (x, y, sx, sy) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${sx} ${sy})">${orn}</g>`;
    return { pat: P.star8(), frame: svg(`<rect x="${r1(i)}" y="${r1(i)}" width="${r1(W - 2 * i)}" height="${r1(H - 2 * i)}" fill="none" stroke="${st2}" stroke-width="${r1(3 * u)}"/><rect x="${r1(i + 12 * u)}" y="${r1(i + 12 * u)}" width="${r1(W - 2 * i - 24 * u)}" height="${r1(H - 2 * i - 24 * u)}" fill="none" stroke="${st}" stroke-width="${r1(1.4 * u)}"/>${at(i + 12 * u, i + 12 * u, 1, 1)}${at(W - i - 12 * u, i + 12 * u, -1, 1)}${at(i + 12 * u, H - i - 12 * u, 1, -1)}${at(W - i - 12 * u, H - i - 12 * u, -1, -1)}`) };
  }
  if (kind === 'najdi') {
    // Najdi architecture: triangle bands at the top and bottom edges
    const t = 34 * u, band = y0 => { let d = ''; for (let x = 0; x < W + t; x += t * 1.2) d += `M${r1(x)} ${r1(y0 + t)}L${r1(x + t * .6)} ${r1(y0)}L${r1(x + t * 1.2)} ${r1(y0 + t)}Z`; return d; };
    return { pat: P.najdi(), frame: svg(`<path d="${band(10 * u)}" fill="${hexA(c, .16)}"/><path d="${band(H - t - 10 * u)}" fill="${hexA(c, .16)}"/><path d="M0 ${r1(t + 22 * u)}H${W}M0 ${r1(H - t - 22 * u)}H${W}" stroke="${st2}" stroke-width="${r1(2 * u)}"/>`) };
  }
  if (kind === 'rosette') {
    // large faint rosette (girih flower) behind the clock
    const cx = W / 2, cy = H > W ? H * .3 : H * .42, R = Math.min(W, H) * .36;
    let g = ''; for (let i = 0; i < 16; i++) { const a = Math.PI * 2 * i / 16; g += `<circle cx="${r1(cx + R * .5 * Math.cos(a))}" cy="${r1(cy + R * .5 * Math.sin(a))}" r="${r1(R * .5)}"/>`; }
    return { pat: P.rings(), frame: svg(`<g fill="none" stroke="${hexA(c, .1)}" stroke-width="${r1(1.6 * u)}">${g}<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(R)}" stroke="${hexA(c, .18)}" stroke-width="${r1(3 * u)}"/><path d="${star(cx, cy, R * .3, R * .22, 8)}"/></g>`) };
  }
  if (kind === 'crescent') {
    const x = H > W ? W * .86 : W * .94, y = H > W ? H * .05 : H * .1, R = 70 * u;
    return { pat: P.dots(), frame: svg(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(R * 2.2)}" fill="${hexA(c2, .08)}"/>${moonSVG(x, y, R, hexA(c, .42))}<path d="${star(x - R * .1, y - R * .05, R * .22, R * .09, 5)}" fill="${hexA(c, .3)}"/><g fill="${f2}"><circle cx="${r1(W * .1)}" cy="${r1(H * .85)}" r="${r1(260 * u)}"/><circle cx="${r1(W * .22)}" cy="${r1(H * .98)}" r="${r1(200 * u)}"/></g>`) };
  }
  if (kind === 'lantern') {
    // Ramadan: lanterns hanging from the top corners, a crescent and stars
    const lan = (x, len, sc) => { const y = len, w = 46 * u * sc, h = 92 * u * sc;
      return `<path d="M${r1(x)} 0V${r1(y)}" stroke="${st2}" stroke-width="${r1(2 * u)}"/>`
        + `<path d="M${r1(x - w * .3)} ${r1(y)}h${r1(w * .6)}l${r1(w * .2)} ${r1(h * .16)}h${r1(-w)}Z" fill="${hexA(c, .45)}"/>`
        + `<path d="M${r1(x - w / 2)} ${r1(y + h * .16)}h${r1(w)}l${r1(-w * .12)} ${r1(h * .62)}h${r1(-w * .76)}Z" fill="${hexA(c, .16)}" stroke="${hexA(c, .5)}" stroke-width="${r1(2 * u)}"/>`
        + `<path d="M${r1(x)} ${r1(y + h * .2)}V${r1(y + h * .74)}M${r1(x - w * .25)} ${r1(y + h * .2)}L${r1(x - w * .2)} ${r1(y + h * .74)}M${r1(x + w * .25)} ${r1(y + h * .2)}L${r1(x + w * .2)} ${r1(y + h * .74)}" stroke="${hexA(c, .35)}" stroke-width="${r1(1.5 * u)}"/>`
        + `<ellipse cx="${r1(x)}" cy="${r1(y + h * .48)}" rx="${r1(w * .16)}" ry="${r1(h * .14)}" fill="${hexA(c2, .35)}"/>`
        + `<path d="M${r1(x - w * .38)} ${r1(y + h * .78)}h${r1(w * .76)}l${r1(-w * .14)} ${r1(h * .12)}h${r1(-w * .48)}Z" fill="${hexA(c, .45)}"/><circle cx="${r1(x)}" cy="${r1(y + h * .97)}" r="${r1(4 * u * sc)}" fill="${hexA(c, .5)}"/>`; };
    const L = W * .06, R = W * .94;
    return { pat: P.dots(), frame: svg(`${lan(L, 60 * u, 1)}${lan(L + 90 * u, 140 * u, .75)}${lan(R, 60 * u, 1)}${lan(R - 90 * u, 140 * u, .75)}${moonSVG(H > W ? W * .5 : W * .27, H > W ? H * .1 : H * .08, 30 * u, hexA(c, .35))}`) };
  }
  if (kind === 'eid') {
    // Eid: bursts of stars and a crescent, festive but calm
    const burst = (x, y, R) => { let d = ''; for (let i = 0; i < 12; i++) { const a = Math.PI * 2 * i / 12; d += `M${r1(x + R * .3 * Math.cos(a))} ${r1(y + R * .3 * Math.sin(a))}L${r1(x + R * Math.cos(a))} ${r1(y + R * Math.sin(a))}`; } return `<path d="${d}" stroke="${hexA(c, .3)}" stroke-width="${r1(3 * u)}" stroke-linecap="round"/><path d="${star(x, y, R * .22, R * .1, 8)}" fill="${hexA(c2, .35)}"/>`; };
    const pts = H > W ? [[.15, .05, 70], [.85, .08, 90], [.12, .9, 80], [.88, .93, 60]] : [[.06, .12, 80], [.94, .14, 100], [.05, .86, 70], [.95, .88, 85]];
    let g = pts.map(([x, y, R]) => burst(W * x, H * y, R * u)).join('');
    const sm = [[.25, .06], [.72, .05], [.4, .95], [.62, .96], [.03, .5], [.97, .5]];
    g += sm.map(([x, y]) => `<path d="${star(W * x, H * y, 9 * u, 4 * u, 5)}" fill="${hexA(c, .4)}"/>`).join('');
    return { pat: P.star8(), frame: svg(g) };
  }
  if (kind === 'star8') return { pat: P.star8(), frame: svg(`<rect x="${r1(20 * u)}" y="${r1(20 * u)}" width="${r1(W - 40 * u)}" height="${r1(H - 40 * u)}" fill="none" stroke="${st2}" stroke-width="${r1(2.5 * u)}" rx="${r1(24 * u)}"/>`) };
  if (kind === 'mashrabiya') return { pat: P.mash(), frame: svg(`<path d="M0 ${r1(H * .82)}H${W}" stroke="${st}" stroke-width="${r1(2 * u)}"/>`) };
  return null;
}

/* ---------- stage sizing / orientation ---------- */
function layoutStage() {
  const st = $('#stage'), vw = innerWidth, vh = innerHeight;
  let o = S.orientation, port, rot = 0;
  if (o === 'auto') port = vh > vw;
  else port = o !== 'landscape';
  const W = port ? 1080 : 1920, H = port ? 1920 : 1080;
  const viewPort = vh > vw;
  if (o === 'portrait' && !viewPort) rot = 90;
  if (o === 'portrait-rev' && !viewPort) rot = -90;
  if (o === 'portrait-rev' && viewPort) rot = 180;
  if (o === 'landscape' && viewPort) rot = 90;
  const rw = rot % 180 ? H : W, rh = rot % 180 ? W : H;
  // screen fit: margin for TVs that crop the edges, overall size, and fit vs fill
  const F = S.screen || {}, m = Math.max(0, Math.min(10, +F.margin || 0)) / 100, z = Math.max(.7, Math.min(1.2, (+F.zoom || 100) / 100));
  const aw = vw * (1 - 2 * m), ah = vh * (1 - 2 * m);
  let sx = Math.min(aw / rw, ah / rh) * z, sy = sx;
  if (F.fit === 'fill') { sx = aw / rw * z; sy = ah / rh * z; }
  if (rot % 180) { const t = sx; sx = sy; sy = t; }   // scale is applied before the rotation
  st.style.width = W + 'px'; st.style.height = H + 'px';
  st.style.transform = `translate(-50%,-50%) rotate(${rot}deg) scale(${sx},${sy})`;
  st.classList.toggle('port', port); st.classList.toggle('land', !port);
  return { W, H, port };
}

/* ---------- theme ---------- */
let stageDim = { W: 1920, H: 1080, port: false };
async function applyTheme() {
  const t = tpl(), c = colors(), r = document.documentElement.style;
  const light = lum(t.bg1) > .4;
  r.setProperty('--bg1', t.bg1); r.setProperty('--bg2', t.bg2); r.setProperty('--tx', t.tx);
  r.setProperty('--p', c.p); r.setProperty('--s', c.s);
  r.setProperty('--on-p', lum(c.p) > .35 ? '#111' : '#fff');
  const cardBg = t.card === 'solid' ? hexA(light ? '#ffffff' : '#000000', light ? .55 : .35) : t.card === 'outline' ? 'transparent' : hexA(light ? '#000000' : '#ffffff', light ? .05 : .08);
  r.setProperty('--card-bg', cardBg); r.setProperty('--card-br', hexA(c.p, t.card === 'outline' ? .8 : .35));
  r.setProperty('--tick-bg', hexA(light ? '#ffffff' : '#000000', light ? .7 : .45));
  r.setProperty('--sec', S.countdown.secColor || c.s);
  r.setProperty('--bgdim', S.design.bgDim);
  applyAlign(); applyTableTheme(t);
  const f = v => v === 'system-ui' ? 'system-ui' : `'${v}'`;
  r.setProperty('--ftext', f(S.font.text)); r.setProperty('--fnum', f(S.font.num));
  document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  const W = stageDim.W, H = stageDim.H;
  const art = artSVG(t.art, c.p, W, H, c.s);
  $('#art').innerHTML = `<div class="pat"></div>${art.frame}`; $('#art .pat').style.backgroundImage = art.pat;
  const img = await DB.url(stageDim.port && S.design.bgImgPort ? S.design.bgImgPort : S.design.bgImg);
  $('#bgimg').style.backgroundImage = img ? `url("${img}")` : 'none';
  $('#bgimg').classList.toggle('none', !img);
  const logo = await DB.url(S.design.logoImg), lb = $('.logo-bg');
  if (lb) {
    const tc = logo && tintColor(S.design.logoTint, S.design.logoColor);
    lb.style.cssText = '';
    if (tc) lb.style.cssText = maskCss(logo, tc); else lb.style.backgroundImage = logo ? `url("${logo}")` : 'none';
    lb.style.opacity = S.design.logoOpacity; lb.style.width = lb.style.height = (S.design.logoSize / 100 * (stageDim.port ? 1000 : 1080)) + 'px'; }
}

/* ---------- text fitting ----------
   A box fits when neither it nor any of its single-line children (.ln) overflows. */
function fits(box) {
  if (box.scrollWidth > box.clientWidth + 1) return false;
  // compare real element boxes with the box (scrollHeight also counts font metrics that are never drawn)
  const br = box.getBoundingClientRect(), cs = getComputedStyle(box), sc = br.height / (box.offsetHeight || 1);
  const pt = parseFloat(cs.paddingTop) * sc, pb = parseFloat(cs.paddingBottom) * sc, tol = 1.5 * sc;
  const kids = box.querySelectorAll('*');
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i]; if (!k.offsetParent && k.tagName !== 'svg') continue;
    const r = k.getBoundingClientRect(); if (!r.height) continue;
    if (r.bottom > br.bottom - pb + tol || r.top < br.top + pt - tol) return false;
    if (r.right > br.right + tol || r.left < br.left - tol) return false;     // nothing may stick out sideways either
  }
  const lines = box.querySelectorAll('.ln');
  for (let i = 0; i < lines.length; i++) if (lines[i].scrollWidth > lines[i].clientWidth + 1) return false;
  return true;
}
/* largest font-size in [min,max] that fits (binary search); apply(s) can scale extra things like widgets */
function fitBox(box, max, min, apply) {
  if (!box || !box.clientHeight) return max;
  const set = apply || (v => { box.style.fontSize = v + 'px'; });
  set(max); if (fits(box)) return max;
  let lo = min, hi = max;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; set(m); if (fits(box)) lo = m; else hi = m; }
  set(lo); return lo;
}
/* refit only when the content or layout key changed */
function fitOnce(box, key, max, min, apply) {
  if (!box) return; const k = key + '|' + fitEpoch;
  if (box._fk === k) return; box._fk = k; return fitBox(box, max, min, apply);
}
let fitEpoch = 0;
function refitAll() { fitEpoch++; }

/* ---------- main screen build ---------- */
let EL = {};
function buildMain() {
  const port = stageDim.port, Lo = S.layout || {};
  const cards = PKEYS.map(k => `<div class="pc fitbox" data-k="${k}"><div class="pn ln"></div><div class="pt ln num"></div><div class="pi ln num"></div></div>`).join('');
  $('#main').innerHTML = `
    <div class="topspace"></div>
    <div class="hero">
      <div class="clockbox fitbox"><div class="clock num ln"><span class="hm"></span><span class="ss"></span><span class="ap"></span></div>
        <div class="dates">${flagOn('clock') ? flagImg('dflag', (2.7 * FLAG_H[S.flag.size || 'm']).toFixed(2) + 'em') : ''}<div class="dlines"><div class="ln"><span class="dday"></span><span class="dsep"> • </span><span class="dh num"></span></div><div class="dg ln num"></div></div></div></div>
      <div class="nextbox fitbox"><div class="nl ln"></div><div class="nn ln"></div><div class="nc ln num"></div><div class="ni ln num"></div><div class="extra ln num"></div></div>
    </div>
    <div class="rot"><div class="rt fitbox"></div></div>
    <div class="ptable"><div class="logo-bg"></div>${cards}</div>
    <div class="banner"></div>
    <div class="bottomspace"></div>`;
  EL = {
    hm: $('.clock .hm'), ss: $('.clock .ss'), ap: $('.clock .ap'), dday: $('.dday'), dh: $('.dh'), dg: $('.dg'),
    nl: $('.nextbox .nl'), nn: $('.nextbox .nn'), nc: $('.nextbox .nc'), ni: $('.nextbox .ni'), extra: $('.nextbox .extra'),
    rot: $('.rot .rt'), banner: $('.banner'), cards: Object.fromEntries($$('.pc').map(e => [e.dataset.k, e])),
    clockbox: $('.clockbox'), nextbox: $('.nextbox'), dsep: $('.dsep'),
  };
  applyLayout(port, Lo);
  refitAll();
}
/* rows of the main screen, sized from the layout settings; every row is a fixed box so nothing overlaps */
function applyLayout(port, Lo) {
  const size = Lo.size || 'large', showRot = Lo.showRot !== false && !hadithPageOn(), showNext = Lo.showNext !== false;
  const main = $('#main'), hero = $('.hero', main), rot = $('.rot', main), table = $('.ptable', main);
  const tableH = port ? null : { normal: 270, large: 245, xl: 225 }[size] || 245;
  const rotH = !showRot ? 0 : port ? ({ normal: 230, large: 200, xl: 170 }[size] || 200) : ({ normal: 116, large: 100, xl: 90 }[size] || 100);
  const heroH = port ? ({ normal: 680, large: 790, xl: 880 }[size] || 790) : null;
  rot.classList.toggle('hide', !showRot);
  EL.nextbox.classList.toggle('hide', !showNext);
  // visual order: name space · hero · hadith · table — or the table first when "table on top" is chosen
  const order = (Lo.tableTop ? ['table', 'rot', 'hero'] : (port ? ['hero', 'table', 'rot'] : ['hero', 'rot', 'table'])).filter(k => k !== 'rot' || showRot);
  const rowOf = { hero: port ? `minmax(0, ${heroH}px)` : 'minmax(0, 1fr)', rot: rotH + 'px', table: port ? 'minmax(0, 1fr)' : tableH + 'px' };
  if (Lo.tableTop && port) { rowOf.hero = 'minmax(0, 1fr)'; rowOf.table = 'minmax(0, 900px)'; }
  const el = { hero, rot, table };
  order.forEach((k, n) => { el[k].style.order = n + 1; });
  $('.topspace', main).style.order = 0; EL.banner.style.order = 4; $('.bottomspace', main).style.order = 5;
  main.style.gridTemplateRows = `var(--toph, ${port ? 170 : 166}px) ${order.map(k => rowOf[k]).join(' ')} auto 96px`;
  // the two widgets: side by side (with a chosen split) or one above the other
  const stack = port || Lo.arrange === 'stack' || !showNext;
  const split = Math.max(30, Math.min(75, +Lo.split || 56));
  hero.style.gridTemplateColumns = stack ? '1fr' : `${split}fr ${100 - split}fr`;
  hero.style.gridTemplateRows = stack ? (showNext ? (port ? '1.15fr 1fr' : '1.35fr 1fr') : '1fr') : '1fr';
  // text size of the time and of the date, relative to each other (the box still keeps both inside its area)
  EL.clockbox.style.setProperty('--ts', (Math.max(40, Math.min(200, +Lo.timeScale || 100)) / 100).toFixed(2));
  EL.clockbox.style.setProperty('--ds', (Math.max(40, Math.min(250, +Lo.dateScale || 100)) / 100).toFixed(2));
  const clockFirst = (Lo.clockSide || 'start') === 'start';
  EL.clockbox.style.order = clockFirst ? 1 : 2; EL.nextbox.style.order = clockFirst ? 2 : 1;
  // next-prayer card: background strength, border, size inside its area, alignment
  const NC = S.nextCard || {}, ncs = Math.max(40, Math.min(100, +NC.scale || 100));
  const nb = EL.nextbox;
  nb.style.setProperty('--nc-op', (Math.max(0, Math.min(100, NC.bg == null ? 100 : +NC.bg)) / 100).toFixed(2));
  nb.classList.toggle('noborder', NC.border === false);
  nb.style.width = ncs < 100 ? ncs + '%' : ''; nb.style.height = ncs < 100 ? ncs + '%' : '';
  const al = { start: 'start', center: 'center', end: 'end' }[NC.align] || 'center';
  nb.style.justifySelf = ncs < 100 ? al : ''; nb.style.alignSelf = ncs < 100 ? 'center' : '';
  $('.ptable').classList.toggle('nc-style', !!NC.table);
  $('.ptable').style.setProperty('--nc-op', nb.style.getPropertyValue('--nc-op'));
  EL.nextbox.classList.toggle('wide', stack && port); EL.nextbox.classList.toggle('wide3', stack && !port);
  EL.clockbox.classList.toggle('wide', stack && !port);
  hero.classList.toggle('stacked', stack);
}

function renderMain(t, sc) {
  const ft = fmtTime(t, {});
  setText(EL.hm, ft.t); setText(EL.ss, S.showSeconds ? num(pad(t.getSeconds())) : ''); setText(EL.ap, ft.suf);
  const dl = dateLines(t, sc);
  setText(EL.dday, dl.day); setText(EL.dh, dl.hijri); setText(EL.dg, dl.greg);
  EL.dh.classList.toggle('hide', !dl.hijri); EL.dsep.classList.toggle('hide', !dl.hijri); EL.dg.classList.toggle('hide', !dl.greg);
  // refit the clock box when the time width changes (9:59 -> 10:00) or the date text changes
  fitOnce(EL.clockbox, ft.t.length + ft.suf + dl.day + dl.hijri + dl.greg + S.showSeconds + (S.flag.code || ''), 170, 30);

  // next prayer
  const np = nextPrayer(t), cur = currentPrayerKey(t);
  setText(EL.nl, T('next'));
  if (np) {
    setText(EL.nn, PN(np.name)); setText(EL.nc, '-' + fmtDur((np.adhan - t) / 1000, true));
    setText(EL.ni, `${T('adhan')} ${fmtT(np.adhan)}  •  ${T('iqama')} ${fmtT(np.iqama)}`);
  }
  const ex = [];
  if (S.night.showLastThird) ex.push(`${T('lastThird')} ${fmtT(sc.lastThird)}`);
  if (S.night.showMidnight) ex.push(`${T('midnight')} ${fmtT(sc.midnight)}`);
  const wt = weatherText(); if (wt) ex.push(wt);
  setText(EL.extra, ex.join('   •   ')); EL.extra.classList.toggle('hide', !ex.length);
  fitOnce(EL.nextbox, (np ? np.name + EL.nc.textContent.length + EL.ni.textContent : '') + EL.extra.textContent, 160, 30);

  // table
  const altDuha = S.duha.display === 'duha' || (S.duha.display === 'alternate' && Math.floor(t.getTime() / 8000) % 2);
  for (const k of PKEYS) {
    const c = EL.cards[k], P = sc[k];
    const isSun = k === 'sunrise', name = isSun ? (altDuha ? 'duha' : 'sunrise') : P.name;
    setText(c.children[0], PN(name));
    const at = fmtTime(isSun && altDuha ? sc.duha : P.adhan);
    const html = `${at.t}${at.suf ? `<small>${at.suf}</small>` : ''}`;
    if (c.children[1].innerHTML !== html) c.children[1].innerHTML = html;
    let iq = '';
    if (!isSun && S.showIqamaOnTable) {
      if (P.jumuah) iq = `${T('khutbah').split(' ')[0]} ${fmtT(P.khutbah)}`;
      else iq = S.iqamaDisplay === 'minutes' ? `+${num(Math.round((P.iqama - P.adhan) / MIN))} ${T('minShort')}` : `${fmtT(P.iqama)}`;
      if (!P.jumuah) iq = `<b>${T('iqama')}</b>${iq}`;
    }
    if (c.children[2].innerHTML !== iq) c.children[2].innerHTML = iq;
    c.children[2].classList.toggle('hide', !iq);
    c.classList.toggle('next', !!np && np.k === k);
    const passed = !isSun && P.prayEnd < t && !(np && np.k === k);
    c.classList.toggle('passed', passed && k !== cur);
  }
  // one shared size for all six cards so they stay uniform
  const ck = PKEYS.map(k => EL.cards[k].textContent).join('|') + fitEpoch;
  if (EL.cards.fajr._fk !== ck) {
    const cs = PKEYS.map(k => EL.cards[k]);
    let m = 100; cs.forEach(c => { m = Math.min(m, fitBox(c, m, 30)); });
    cs.forEach(c => { c.style.fontSize = m + 'px'; c._fk = ck; });
  }

  // rotator (hadith + events) — only when the hadith are not shown on a page of their own
  const items = hadithPageOn() ? [] : rotatorItems(t);
  if (items.length) {
    const it = pickTimed(items, t.getTime(), 0, Math.max(8, +S.content.hadith.sec || 25));
    const key = it.t + it.s;
    if (EL.rot._k !== key + fitEpoch) {
      EL.rot._k = key + fitEpoch;
      EL.rot.innerHTML = `${it.tag ? `<span class="rtag">${esc(it.tag)}</span>` : ''}<span>${esc(it.t)}</span>${it.s ? `<span class="rs">— ${esc(it.s)}</span>` : ''}`;
      fitBox(EL.rot, stageDim.port ? 50 : 44, 20);
    }
  } else if (EL.rot._k !== '') { EL.rot._k = ''; EL.rot.innerHTML = ''; }

  // banners (funeral & notices)
  const fun = (S.funerals || []).filter(it => funeralActive(it, t)).map(it => ({ text: funeralText(it) }));
  const nb = [...fun, ...S.notices.filter(n => !n.until || new Date(n.until) > t)].slice(0, 3).map(n => `<div class="bn fitbox"><span class="ln">${esc(n.text)}</span></div>`).join('');
  if (EL.banner._h !== nb + fitEpoch) { EL.banner._h = nb + fitEpoch; EL.banner.innerHTML = nb; $$('.bn', EL.banner).forEach(b => fitBox(b, 34, 16)); }
}
/* pick the item showing at `elapsed` ms: items with their own duration (d, seconds) keep it,
   the others share what is left of `total` (or get defSec each when there is no window) */
function pickTimed(list, elapsed, total, defSec) {
  if (!list.length) return null;
  const own = x => (+x.d > 0 ? +x.d * 1000 : 0);
  const fixed = list.reduce((a, x) => a + own(x), 0), autoN = list.filter(x => !own(x)).length;
  const auto = total ? Math.max(12000, autoN ? (total - fixed) / autoN : 0) : defSec * 1000;
  const durs = list.map(x => own(x) || auto), cyc = durs.reduce((a, b) => a + b, 0) || 1;
  let r = ((elapsed % cyc) + cyc) % cyc;
  for (let i = 0; i < list.length; i++) { if (r < durs[i]) return list[i]; r -= durs[i]; }
  return list[0];
}
function rotatorItems(t) {
  const L = [], dk = dayKey(t);
  for (const e of S.events) if (e.on !== false && (!e.from || e.from <= dk) && (!e.to || e.to >= dk)) L.push({ t: e.title + (e.text ? ' — ' + e.text : ''), tag: T('event') });
  if (S.content.hadith.on) L.push(...S.hadiths.filter(x => x.on !== false && x.t).map(x => Object.assign({ kind: Lx('حديث شريف', 'Hadith') }, x)));
  if (S.content.sets.masjid !== false) L.push(...(S.azkar.masjid || []).filter(x => x.on !== false && x.t).map(x => ({ t: x.t + (countLabel(x.c) ? ' (' + countLabel(x.c) + ')' : ''), s: x.s, d: x.d, kind: x.n || Lx('ذكر', 'Dhikr') })));
  L.push(...libLineItems().map(x => { const c = IB_CATS.find(y => y.k === x.cat); return { t: x.t + (countLabel(x.c) ? ' (' + countLabel(x.c) + ')' : ''), s: x.s, kind: c ? Lx(c.ar, c.en) : '' }; }));
  return withOccasions(L, t);
}

/* ---------- hadith page: each hadith on a page of its own, taking turns with the prayer-times screen ----------
   The prayer-times screen shows for `every` seconds, then 1..5 hadith pages. Each page stays as long as reading it
   needs: about 4 s + its words at the chosen reading speed (the source counts half), within min..max seconds.
   An item with its own duration keeps it. The text is sized to fill the page, so short hadith are large. */
const HP_WPS = { slow: 1.3, normal: 1.8, fast: 2.5 };     // words per second, read from a distance
const hadithPageOn = () => !!(S.hadithPage && S.hadithPage.on);
const hpWords = s => String(s || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED«»"()]/g, '').split(/\s+/).filter(w => w && !/^[—–\-:،.]+$/.test(w)).length;
function hpDur(it) {
  const H = S.hadithPage;
  if (+it.d > 0) return +it.d;
  const sec = 4 + (hpWords(it.t) + hpWords(it.s) / 2) / (HP_WPS[H.speed] || HP_WPS.normal);
  return Math.round(Math.max(+H.minSec || 10, Math.min(Math.max(+H.minSec || 10, +H.maxSec || 90), sec)));
}
let hpCache = { k: '', seg: [], total: 0 };
function hadithPageNow(t, force) {
  if (!hadithPageOn() && !force) return null;
  const H = S.hadithPage, items = rotatorItems(t);
  if (!items.length) return null;
  const k = JSON.stringify(H) + items.length + '|' + items.map(x => x.t.length + '.' + (x.d || '')).join(',') + items[0].t.slice(0, 24);
  if (hpCache.k !== k) {
    const seg = [], gap = Math.max(5, +H.every || 45) * 1000, per = Math.max(1, Math.min(5, +H.perVisit || 1));
    let at = 0;
    items.forEach((it, i) => { if (i % per === 0) at += gap; const d = hpDur(it) * 1000; seg.push({ from: at, to: at + d, it }); at += d; });
    hpCache = { k, seg, total: at };
  }
  const day = new Date(t); day.setHours(0, 0, 0, 0);
  let pos = (t - day) % hpCache.total;
  if (force) { const s0 = hpCache.seg[Math.floor(pos / 15000) % hpCache.seg.length]; return { it: s0.it, dur: 15000, left: 15000 - pos % 15000, id: s0.from }; }
  for (const s of hpCache.seg) if (pos >= s.from && pos < s.to) return { it: s.it, dur: s.to - s.from, left: s.to - pos, id: s.from };
  return null;
}
/* ---------- between the adhan and the iqamah: the countdown for cdSec seconds, then one text on a page of its own,
   then the countdown again … The last lastSec seconds show the countdown only. Texts: the recommended deeds and
   hadith of this prayer (WAIT_TIPS) or the mosque's own. Each stays as long as reading it needs (hpDur). */
function waitPageNow(t, ph) {
  const W = S.waitTips || {};
  if (!ph || ph.ph !== 'countdown' || !W.on || W.page === false || !ph.target) return null;
  const tips = waitTips(ph.P); if (!tips.length) return null;
  const items = tips.map(x => { const o = splitSrc(x); return { t: o.t, s: o.s, tag: Lx('بين الأذان والإقامة', 'While waiting') }; });
  const cd = { label: (S.lang === 'ar' ? 'صلاة ' : '') + PN(ph.P.name) + ' • ' + T(ph.P.jumuah ? 'khutbahIn' : 'iqamaAfter'), target: ph.target };
  if (ph.forceTip) { const i = Math.floor(t / 15000) % items.length; return { it: items[i], dur: 15000, left: 15000 - t % 15000, id: 'w' + i, cd }; }
  if (ph.target - t <= Math.max(0, +W.lastSec || 0) * 1000) return null;
  const gap = Math.max(3, +W.cdSec || 5) * 1000, seg = []; let at = 0;
  items.forEach(it => { at += gap; const d = hpDur(it) * 1000; seg.push({ from: at, to: at + d, it }); at += d; });
  const pos = (t - ph.from) % at;
  for (const x of seg) if (pos >= x.from && pos < x.to) {
    const left = Math.min(x.to - pos, ph.target - t - Math.max(0, +W.lastSec || 0) * 1000);
    return { it: x.it, dur: x.to - x.from, left: Math.max(0, left), id: 'w' + x.from + '|' + Math.floor((t - ph.from) / at), cd };
  }
  return null;
}
function renderHadithPage(hp, t) {
  const L = $('#hpg'), H = S.hadithPage || {};
  if (!hp) { if (L._k) { L.className = 'layer'; L.innerHTML = ''; L._k = ''; } return false; }
  const it = hp.it, key = it.t + '|' + it.s + '|' + hp.id + '|' + fitEpoch + JSON.stringify(H) + (hp.noname ? 'n' : '');
  if (L._k !== key) {
    L._k = key; L._cd = hp.cd || null; L.className = 'layer on' + (H.clock === false && !hp.cd ? ' noclock' : '') + (hp.cd ? ' wait' : '') + (hp.noname ? ' noname' : '');
    const label = it.tag || it.kind || Lx('حديث شريف', 'Hadith');
    L.innerHTML = `<div class="hpw">${H.clock !== false || hp.cd ? '<div class="hptop"><span class="hpclk"></span><span class="hpnext"></span></div>' : ''}
      <div class="hpcard"><div class="hplab">${esc(label)}</div><div class="hptx"><div class="hpt">${esc(it.t)}</div>${it.s ? `<div class="hps">${esc(it.s)}</div>` : ''}</div>
      ${H.progress !== false ? '<div class="hpbar"><i></i></div>' : ''}</div></div>`;
    hpClock(L, t, H);                 // fill the top line first: its height is part of the space the text gets
    const sc = Math.max(60, Math.min(160, +H.scale || 100)) / 100;
    fitBox($('.hptx', L), Math.round((stageDim.port ? 104 : 118) * sc), 30);
    L.querySelector('.hpw').classList.add('in');
  }
  const bar = $('.hpbar i', L); if (bar) bar.style.width = (100 * Math.max(0, hp.left) / hp.dur).toFixed(2) + '%';
  hpClock(L, t, H);
  return true;
}
function hpClock(L, t, H) {
  if (L._cd) {     // the waiting page keeps the iqamah countdown in view
    setText($('.hpnext', L), L._cd.label);
    setText($('.hpclk', L), fmtDur(Math.max(0, (L._cd.target - t) / 1000)));
    return;
  }
  if (H.clock === false) return;
  const ft = fmtTime(t, {}), np = nextPrayer(t);
  setText($('.hpclk', L), ft.t + (ft.suf ? ' ' + ft.suf : ''));
  setText($('.hpnext', L), np ? `${PN(np.name)} ${fmtT(np.adhan)}  •  -${fmtDur((np.adhan - t) / 1000, true)}` : '');
}

/* ---------- ticker ---------- */
let tickKey = '';
function renderTicker(visible) {
  const oc = occTicker(now()), tk = $('#ticker'), items = oc.alone ? oc.items : [...oc.items, ...S.ticker.items.filter(i => i.on !== false && i.t)];
  const show = visible && S.ticker.on && items.length;
  tk.classList.toggle('hide', !show);
  const key = JSON.stringify([items, S.ticker.mode, S.ticker.speed, S.lang, stageDim.W]);
  if (!show || key === tickKey) return;
  tickKey = key; tk.classList.toggle('static', S.ticker.mode === 'static');
  if (S.ticker.mode === 'static') { tk.innerHTML = `<div class="tk"></div>`; tk._items = items; return; }
  tk.innerHTML = `<div class="tk">${items.map(i => `<span>${esc(i.t)}</span>`).join('')}</div>`;
  const el = tk.firstChild; const w = el.offsetWidth, W = stageDim.W;
  const pxs = { slow: 70, normal: 110, fast: 170 }[S.ticker.speed] || 110;
  el.style.setProperty('--tw', W + 'px');
  const rtl = S.lang === 'ar';
  const dur = (w + W) / pxs;
  el.style.left = '0'; el.style.animation = `${rtl ? 'tickRTL' : 'tickLTR'} ${dur}s linear ${-0.7 * W / pxs}s infinite`;
}
function tickStatic(t) {
  const tk = $('#ticker'); if (S.ticker.mode !== 'static' || !tk._items) return;
  const it = tk._items[Math.floor(t.getTime() / 8000) % tk._items.length], v = it ? it.t : '';
  if (tk.firstChild._v !== v) { tk.firstChild._v = v; tk.firstChild.innerHTML = `<span class="ln" style="margin:0">${esc(v)}</span>`; tk.firstChild.classList.add('fitbox'); fitBox(tk.firstChild, 40, 18); }
}

/* ---------- countdown widgets ---------- */
function makeCountdown(style, host) {
  host.className = 'cd cd-' + ({ led: 'led', modern: 'modern', flip: 'flip', segments: 'seg' }[style] || style);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const digits = (rem) => { const m = Math.floor(rem / 60), s = Math.floor(rem % 60); return { m: num(pad(m)), s: num(pad(s)) }; };
  const showSec = S.countdown.showSec;
  const digHTML = (d, big) => `<span>${d.m}</span>${showSec ? `<span class="colon">:</span><span class="sec">${d.s}</span>` : ''}`;
  const ringSVG = (size, sw, inner) => `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${inner}</svg>`;
  const C = (r, extra) => `<circle cx="0" cy="0" r="${r}" fill="none" ${extra}/>`;
  let upd;
  if (style === 'ring' || style === 'arc' || style === 'rings2') {
    const S0 = 500, r = 214, sw = 24, circ = 2 * Math.PI * r, arcF = style === 'arc' ? .75 : 1;
    const r2 = 172, circ2 = 2 * Math.PI * r2;
    host.innerHTML = ringSVG(S0, sw, `<g transform="translate(${S0 / 2} ${S0 / 2}) rotate(${style === 'arc' ? 135 : -90})">
      ${C(r, `stroke="rgba(255,255,255,.14)" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${circ * arcF} ${circ}"`)}
      ${C(r, `class="pr" stroke="var(--p)" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="0 ${circ}" style="transition:stroke-dasharray 1s linear"`)}
      ${style === 'rings2' ? C(r2, `stroke="rgba(255,255,255,.12)" stroke-width="18"`) + C(r2, `class="pr2" stroke="var(--sec)" stroke-width="18" stroke-linecap="round" stroke-dasharray="0 ${circ2}"`) : ''}
      </g>`) + `<div class="center dig num" style="font-size:${style === 'rings2' ? 120 : 140}px"></div>`;
    const pr = $('.pr', host), pr2 = $('.pr2', host), dg = $('.dig', host);
    upd = (rem, tot) => {
      const f = tot ? Math.max(0, Math.min(1, rem / tot)) : 0;
      pr.setAttribute('stroke-dasharray', `${circ * arcF * f} ${circ}`);
      if (pr2) pr2.setAttribute('stroke-dasharray', `${circ2 * ((rem % 60) / 60)} ${circ2}`);
      const h = digHTML(digits(rem)); if (dg.innerHTML !== h) dg.innerHTML = h;
    };
  } else if (style === 'modern') {
    host.innerHTML = `<div class="dig num"></div><div class="bar"><i></i></div>`;
    const dg = $('.dig', host), bar = $('.bar i', host);
    upd = (rem, tot) => { const h = digHTML(digits(rem)); if (dg.innerHTML !== h) dg.innerHTML = h; bar.style.width = (tot ? rem / tot * 100 : 0) + '%'; };
  } else if (style === 'led') {
    host.innerHTML = `<div class="dig"><span class="ghost">88${showSec ? ':88' : ''}</span><span class="v"></span></div>`;
    const v = $('.v', host);
    upd = rem => { const d = digits(rem); const h = `${d.m}${showSec ? `:<span class="sec">${d.s}</span>` : ''}`; if (v.innerHTML !== h) v.innerHTML = h; };
  } else if (style === 'flip') {
    host.innerHTML = `<div class="cards num"><div class="card"></div><div class="card"></div>${showSec ? '<div class="colon">:</div><div class="card"></div><div class="card"></div>' : ''}</div>`;
    const cards = $$('.card', host);
    upd = rem => {
      const m = Math.floor(rem / 60), s = Math.floor(rem % 60), str = pad(Math.min(m, 99)) + (showSec ? pad(s) : '');
      cards.forEach((c, i) => { const v = num(str[i]); if (c.textContent !== v) { c.textContent = v; c.classList.remove('f'); void c.offsetWidth; c.classList.add('f'); } });
    };
  } else if (style === 'hourglass') {
    host.innerHTML = `<svg width="300" height="430" viewBox="-180 -260 360 520">
      <defs><clipPath id="hgTop"><path d="M-130 -230 H130 L12 -10 H-12 Z"/></clipPath><clipPath id="hgBot"><path d="M-12 10 H12 L130 230 H-130 Z"/></clipPath></defs>
      <rect x="-160" y="-260" width="320" height="30" rx="12" fill="var(--p)"/><rect x="-160" y="230" width="320" height="30" rx="12" fill="var(--p)"/>
      <path d="M-130 -230 H130 L12 -10 V10 L130 230 H-130 L-12 10 V-10 Z" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.5)" stroke-width="5"/>
      <rect class="st" clip-path="url(#hgTop)" x="-140" y="-230" width="280" height="220" fill="var(--s)"/>
      <rect class="sb" clip-path="url(#hgBot)" x="-140" y="230" width="280" height="0" fill="var(--s)"/>
      <line class="sandfall" x1="0" y1="-10" x2="0" y2="225" stroke="var(--s)" stroke-width="5" stroke-dasharray="8 4"/></svg>
      <div class="dig num" style="font-size:110px;margin-top:20px"></div>`;
    const st = $('.st', host), sb = $('.sb', host), dg = $('.dig', host);
    upd = (rem, tot) => {
      const f = tot ? Math.max(0, Math.min(1, rem / tot)) : 0; const th = 220 * f, bh = 220 * (1 - f);
      st.setAttribute('y', -10 - th); st.setAttribute('height', th); sb.setAttribute('y', 230 - bh); sb.setAttribute('height', bh);
      const h = digHTML(digits(rem)); if (dg.innerHTML !== h) dg.innerHTML = h;
    };
  } else if (style === 'liquid') {
    const R = 220;
    host.innerHTML = `<svg width="${2 * R + 20}" height="${2 * R + 20}" viewBox="${-R - 10} ${-R - 10} ${2 * R + 20} ${2 * R + 20}">
      <defs><clipPath id="lqc"><circle r="${R - 12}"/></clipPath></defs>
      <circle r="${R}" fill="none" stroke="var(--p)" stroke-width="10"/>
      <g clip-path="url(#lqc)"><g class="lv" style="transition:transform 1s linear"><path class="wave" fill="var(--s)" fill-opacity=".85"
        d="M-650 0 Q-550 -30 -450 0 T-250 0 T-50 0 T150 0 T350 0 T550 0 T750 0 T950 0 V700 H-650 Z"/></g></g></svg>
      <div class="center dig num" style="font-size:140px;text-shadow:0 4px 20px rgba(0,0,0,.6)"></div>`;
    const lv = $('.lv', host), dg = $('.dig', host);
    upd = (rem, tot) => { const f = tot ? Math.max(0, Math.min(1, rem / tot)) : 0; lv.setAttribute('transform', `translate(0 ${R - 2 * R * f})`); const h = digHTML(digits(rem)); if (dg.innerHTML !== h) dg.innerHTML = h; };
  } else if (style === 'orbit') {
    const R = 220; let dots = '';
    for (let i = 0; i < 60; i++) { const a = (i / 60) * 2 * Math.PI - Math.PI / 2; dots += `<circle class="od" cx="${(R * Math.cos(a)).toFixed(1)}" cy="${(R * Math.sin(a)).toFixed(1)}" r="${i % 5 ? 9 : 14}"/>`; }
    host.innerHTML = `<svg width="${2 * R + 60}" height="${2 * R + 60}" viewBox="${-R - 30} ${-R - 30} ${2 * R + 60} ${2 * R + 60}">${dots}</svg><div class="center dig num"></div>`;
    const ds = $$('.od', host), dg = $('.dig', host);
    upd = rem => {
      const s = Math.floor(rem % 60) || (rem > 0 ? 60 : 0);
      ds.forEach((d, i) => d.setAttribute('fill', i < s ? 'var(--p)' : 'rgba(255,255,255,.15)'));
      const h = digHTML(digits(rem)); if (dg.innerHTML !== h) dg.innerHTML = h;
    };
  } else if (style === 'segments') {
    host.innerHTML = `<div class="dig num"></div><div class="segs"></div>`;
    const dg = $('.dig', host), sg = $('.segs', host);
    upd = (rem, tot) => {
      const n = Math.max(1, Math.min(30, Math.ceil(tot / 60))), on = Math.ceil(rem / tot * n);
      if (sg.children.length !== n) sg.innerHTML = '<i></i>'.repeat(n);
      [...sg.children].forEach((e, i) => e.classList.toggle('on', i < on));
      const h = digHTML(digits(rem)); if (dg.innerHTML !== h) dg.innerHTML = h;
    };
  } else { // square
    const Sq = 460;
    host.innerHTML = `<svg width="${Sq}" height="${Sq}" viewBox="0 0 ${Sq} ${Sq}"><rect x="15" y="15" width="${Sq - 30}" height="${Sq - 30}" rx="40" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="24"/>
      <rect class="pr" x="15" y="15" width="${Sq - 30}" height="${Sq - 30}" rx="40" fill="none" stroke="var(--p)" stroke-width="24" pathLength="100" stroke-dasharray="0 100" stroke-linecap="round"/></svg><div class="center dig num" style="font-size:130px"></div>`;
    const pr = $('.pr', host), dg = $('.dig', host);
    upd = (rem, tot) => { const f = tot ? rem / tot : 0; pr.setAttribute('stroke-dasharray', `${100 * f} 100`); const h = digHTML(digits(rem)); if (dg.innerHTML !== h) dg.innerHTML = h; };
  }
  return { update: upd };
}

/* ---------- overlays ---------- */
let ovKey = '', cdWidget = null;
function renderOverlay(ph, t, sc) {
  const ov = $('#ov');
  if (ph.ph === 'normal') { if (ovKey) { ov.className = 'layer'; ov.innerHTML = ''; ovKey = ''; } return false; }
  const P = ph.P; let key = ph.ph + (P ? P.k : '') + (ph.kind || '') + (ph.set || '') + fitEpoch;
  // special phases switch from the announcement to a black screen after `ann` seconds
  let blackSpecial = false;
  if (ph.ph === 'special' && (t - ph.from) / 1000 > (+ph.ann || 60)) { blackSpecial = true; key += 'b'; }
  if (ph.ph === 'khutbah' && S.friday.mode === 'black') blackSpecial = true;
  if (ph.ph === 'prayer' && S.saver.on && S.saver.mode === 'during') { ov.className = 'layer'; ov.innerHTML = ''; ovKey = 'saver'; return 'saver'; }
  const live = ph.ph === 'countdown' ? S.notices.filter(n => !n.until || new Date(n.until) > t).map(n => n.text).join('|') : '';
  key += live;

  if (key !== ovKey) {
    ovKey = key; cdWidget = null;
    const pn = P ? PN(P.name) : '', ar = S.lang === 'ar';
    const black = ph.ph === 'prayer' || blackSpecial;
    ov.className = 'layer on' + (black ? ' black' : '');
    let h = '';
    if (ph.ph === 'adhan') h = `<div class="t1 ln">${T('adhanNow')}</div><div class="t2 ln">${pn}</div><div class="t3 ltr num ln">${fmtT(P.adhan)}</div>${S.adhanText.repeat !== false ? `<div class="t4 rep">${ADHAN_REPEAT}</div>` : ''}${S.adhanText.dua !== false ? `<div class="t4">${Lx('دعاء بعد الأذان: ', 'After the adhan: ')}${ADHAN_DUA}</div>` : ''}`;
    else if (ph.ph === 'countdown') h = `<div class="t2 md ln">${ar ? 'صلاة ' : ''}${pn}</div><div class="t1 ln">${P.jumuah ? T('khutbahIn') : T('iqamaAfter')}</div><div class="cdhost"></div><div class="silent hide">${T('silent')}</div><div class="t1 oct num ln" style="font-size:.42em;opacity:.75;direction:ltr">${fmtT(t)}</div>${live ? live.split('|').map(x => `<div class="t4">${esc(x)}</div>`).join('') : ''}`;
    else if (ph.ph === 'iqama') h = `<div class="t1 ln">${T('iqamaNow')}</div><div class="t2 ln">${pn}</div><div class="t4" style="font-size:.56em">${T('straighten')}</div>${S.silentNotice.on ? `<div class="silent">${T('silent')}</div>` : ''}`;
    else if (ph.ph === 'khutbah' && !blackSpecial) h = `<div class="t2 ln">${T('khutbah')}</div>${S.friday.title ? `<div class="t3">${esc(S.friday.title)}</div>` : ''}<div class="t4">${T('khutbahSub')}</div>`;
    else if (ph.ph === 'special' && !blackSpecial) h = `<div class="t2">${T(ph.kind + 'Now')}</div><div class="t3 ltr num ln">${fmtT(ph.from)}</div>`;
    else if (ph.ph === 'notice') h = `<div class="t2">${T(ph.kind + 'Now')}</div><div class="t3 ltr num ln">${fmtT(ph.from)}</div>`;
    if (ph.ph === 'azkar') {
      const AV = S.azkarView || {}, all = AV.mode === 'all' || (AV.mode === 'image' && !azImgs(ph.set).length);
      if (AV.mode === 'image' && azImgs(ph.set).length) {
        // the adhkar shown as the user's own designed picture(s), full screen
        ov.classList.add('azimgmode');
        ov.innerHTML = `<div class="azimgs fit-${AV.imgFit || 'blur'}"><img class="gbg" alt=""><img class="gimg" alt=""></div>`;
        ov._ai = -1; ov._pg = null;
      } else {
      ov.innerHTML = `<div class="azbg"></div><div class="azk${all ? ' all' : ''}"><div class="ah">${T(ph.set === 'after' ? 'azkarAfter' : ph.set)}<span class="azpg num"></span></div>${all ? '<div class="azgrid"></div>' : '<div class="atb fitbox"><div class="at"></div></div><div class="as"></div>'}${S.dateOnAzkar ? '<div class="ad num ln"></div>' : ''}</div>`;
      ov._pg = null;
      // picture chosen for this adhkar set (morning / evening / after prayer)
      const bid = AV.bg && AV.bg[ph.set];
      if (bid) DB.url(bid).then(u => { const b = $('.azbg', ov); if (!b || !u) return; b.style.backgroundImage = `linear-gradient(rgba(0,0,0,${+AV.dim || 0}),rgba(0,0,0,${+AV.dim || 0})),url("${u}")`; ov.classList.add('img'); });
      }
    }
    else ov.innerHTML = h ? `<div class="ovb fitbox">${h}</div>` : '';
    if (ph.ph === 'countdown') cdWidget = makeCountdown(S.countdown.style, $('.cdhost', ov));
    const box = $('.ovb', ov);
    if (box) {
      // the countdown widget is pixel-sized, so it scales together with the text through zoom
      const host = $('.cd', ov), ar0 = host ? 1 : 0;
      if (cdWidget) cdWidget.update(Math.max(0, (ph.target - t) / 1000), (ph.target - ph.from) / 1000);
      const sil = $('.silent', ov); if (sil) sil.classList.remove('hide');      // measure with the notice visible
      // countdown size setting: the counter grows the most, the text around it a little, and the box still fits
      const k = host ? Math.max(.8, Math.min(2.2, (+S.countdown.size || 100) / 100)) : 1;
      fitBox(box, Math.round(100 * Math.sqrt(k)), 28, v => { box.style.fontSize = v + 'px'; if (host) host.style.zoom = (v / 100 * k / Math.sqrt(k)).toFixed(3); });
      if (sil && ph.ph === 'countdown') sil.classList.add('hide');
    }
  }
  // live parts
  if (ph.ph === 'countdown' && cdWidget) {
    const rem = (ph.target - t) / 1000, tot = (ph.target - ph.from) / 1000;
    cdWidget.update(rem, tot);
    setText($('.oct', ov), fmtT(t));
    const sil = $('.silent', ov); if (sil) sil.classList.toggle('hide', !(S.silentNotice.on && rem <= S.silentNotice.minBefore * 60));
  }
  if (ph.ph === 'azkar') { const ad = $('.ad', ov); if (ad) { const d = dateLines(t, sc); setText(ad, [d.day, d.hijri, d.greg].filter(Boolean).join('  •  ')); } }
  if (ph.ph === 'azkar' && $('.azimgs', ov)) renderAzkarImages(ov, ph, t);
  else if (ph.ph === 'azkar' && $('.azgrid', ov)) renderAzkarCards(ov, ph, t);
  else if (ph.ph === 'azkar') {
    const list = azkarList(ph.set);
    const it = pickTimed(list, t - ph.from, ph.to - ph.from) || { t: '' };
    const at = $('.at', ov), atb = $('.atb', ov);
    if (at && at._k !== it.t + fitEpoch) {
      at._k = it.t + fitEpoch;
      at.innerHTML = esc(it.t) + (countLabel(it.c) ? `<span class="cnt num">${countLabel(it.c)}</span>` : '');
      setText($('.as', ov), it.s || '');
      fitBox(atb, stageDim.port ? 66 : 64, 22, v => { at.style.fontSize = v + 'px'; });
    }
  }
  return ph.ph === 'khutbah' && S.friday.mode === 'gallery' ? 'khutbahGallery' : true;
}
/* all adhkar of a set at once: aligned cards in columns, each with its count and notes.
   When they cannot all be read at a comfortable size they are split into pages that share the time. */
function azCardHTML(x, cls) {
  const n = S.azkarView.notes !== false, cl = countLabel(x.c);
  const meta = (cl ? `<span class="cnt num">${cl}</span>` : '') + (x.n ? `<span class="azn">${esc(x.n)}</span>` : '') + (n && x.s ? `<span class="azs">${esc(x.s)}</span>` : '');
  return `<div class="azc${cls ? ' ' + cls : ''}"><div class="azt">${esc(x.t)}</div>${meta ? `<div class="azm">${meta}</div>` : ''}</div>`;
}
/* rows of up to k cards, centred side by side: in a row of three the longest dhikr is the main card in the middle
   and the two shorter ones sit on the sides (a lone last card is avoided: 4 → 2 + 2) */
function azRows(items, k) {
  k = Math.max(1, Math.min(3, k | 0)); const sizes = []; let left = items.length;
  while (left > 0) { let n = Math.min(k, left); if (k === 3 && left === 4) n = 2; sizes.push(n); left -= n; }
  let i = 0; const L = x => (x.t || '').length + ((S.azkarView.notes !== false && x.s) ? x.s.length * .5 : 0);
  return sizes.map(n => {
    const r = items.slice(i, i + n); i += n;
    if (r.length === 2) { const a = L(r[0]), b2 = L(r[1]), g = v => Math.max(1, Math.min(2.2, Math.sqrt(v))); return [{ x: r[0], cls: 'side', mg: a > b2 ? g(a / Math.max(1, b2)) : 0 }, { x: r[1], cls: 'side', mg: b2 > a ? g(b2 / Math.max(1, a)) : 0 }]; }
    if (r.length !== 3) return r.map(x => ({ x, cls: 'side' }));
    let m = 0; r.forEach((x, j) => { if (L(x) > L(r[m])) m = j; });
    const sides = r.filter((_, j) => j !== m), mg = Math.max(1.15, Math.min(2.2, Math.sqrt(L(r[m]) / Math.max(1, (L(sides[0]) + L(sides[1])) / 2))));
    return [{ x: sides[0], cls: 'side' }, { x: r[m], cls: 'main', mg }, { x: sides[1], cls: 'side' }];
  });
}
function azBuild(grid, items, k) {
  grid.innerHTML = azRows(items, k).map(r => `<div class="azrow n${r.length}">${r.map(c => azCardHTML(c.x, c.cls).replace('<div class="azc', c.mg ? `<div style="flex-grow:${c.mg.toFixed(2)}" class="azc` : '<div class="azc')).join('')}</div>`).join('');
}
/* side cards of a row get the same height, and the main card is never shorter than them */
function azEqualize(grid) {
  const rows = $$('.azrow', grid);
  rows.forEach(r => $$('.azc', r).forEach(c => { c.style.minHeight = ''; }));
  rows.forEach(r => {
    if (r.classList.contains('n2')) { const cs = $$('.azc', r), h2 = Math.max(...cs.map(c => c.offsetHeight)); cs.forEach(c => { c.style.minHeight = h2 + 'px'; }); return; }
    const sides = $$('.azc.side', r), main = $('.azc.main', r); if (!sides.length) return;
    const h = Math.max(...sides.map(c => c.offsetHeight));
    sides.forEach(c => { c.style.minHeight = h + 'px'; }); if (main && main.offsetHeight < h) main.style.minHeight = h + 'px';
  });
}
function azSetFont(grid, v) { grid.style.fontSize = v + 'px'; azEqualize(grid); }
function layoutAzCards(grid, items, k) {
  azBuild(grid, items, k);
  // nothing may spill out of the screen or touch another card (the rows are flex boxes, so cards never overlap)
  const ok = () => fits(grid);
  const set = v => azSetFont(grid, v);
  let lo = 16, hi = stageDim.port ? 60 : 56;
  set(hi); if (ok()) return hi;
  set(lo); if (!ok()) return 0;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; set(m); if (ok()) lo = m; else hi = m; }
  set(lo); return lo;
}
function planAzPages(grid, list) {
  const port = stageDim.port, want = port ? 30 : 32, n = list.length;
  const colOpts = +S.azkarView.cols > 0 ? [Math.min(3, +S.azkarView.cols)] : (port ? [3, 1] : [3]);
  // one card-per-row choice for every page; the fewest pages wins, then the larger text
  const planFor = k => {
    for (let p = 1; p <= n; p++) {
      // pages share the cards evenly (e.g. 14 → 5 + 5 + 4), each page laid out in centred rows
      const pages = []; let i0 = 0;
      for (let j = 0; j < p; j++) { const c = Math.floor(n / p) + (j < n % p ? 1 : 0); pages.push(list.slice(i0, i0 + c)); i0 += c; }
      const plans = []; let ok = true;
      for (const items of pages) { const f = layoutAzCards(grid, items, k) || 16; plans.push({ f, cols: k, items }); if (f < want) { ok = false; if (p < n) break; } }
      if (ok || p === n) return plans;
    }
    return [];
  };
  let best = null;
  for (const k of colOpts) {
    const pl = planFor(k), mf = Math.min(...pl.map(x => x.f));
    // the three-card arrangement (largest in the middle) is preferred unless another needs fewer pages or reads much larger
    if (!best || pl.length < best.pl.length || (pl.length === best.pl.length && mf > best.mf * 1.15)) best = { pl, mf };
  }
  return best ? best.pl : [];
}
function renderAzkarCards(ov, ph, t) {
  const grid = $('.azgrid', ov); if (!grid || !grid.clientHeight) return;
  const list = azkarList(ph.set).filter(x => x.t);
  const k = list.map(x => x.t + x.c + (x.n || '')).join('|') + fitEpoch + S.azkarView.notes + S.azkarView.cols;
  if (!ov._pg || ov._pg.k !== k) { ov._pg = { k, plans: planAzPages(grid, list), cur: -1 }; }
  const pg = ov._pg, np = pg.plans.length; if (!np) return;
  const total = Math.max(1, ph.to - ph.from), i = Math.min(np - 1, Math.floor(Math.max(0, t - ph.from) / (total / np)));
  if (i !== pg.cur) {
    pg.cur = i; const pl = pg.plans[i];
    azBuild(grid, pl.items, pl.cols); azSetFont(grid, pl.f);
    grid.classList.remove('fade'); void grid.offsetWidth; grid.classList.add('fade');
    setText($('.azpg', ov), np > 1 ? `${num(i + 1)} / ${num(np)}` : '');
  }
}
/* pictures chosen for an adhkar set (image mode); several pictures share the adhkar time */
const azImgs = set => ((S.azkarView.imgs || {})[set] || []).filter(Boolean);
function renderAzkarImages(ov, ph, t) {
  const L = azImgs(ph.set); if (!L.length) return;
  const total = Math.max(1, ph.to - ph.from), i = Math.min(L.length - 1, Math.floor(Math.max(0, t - ph.from) / (total / L.length)));
  if (i === ov._ai) return; ov._ai = i;
  DB.url(L[i]).then(u => {
    const box = $('.azimgs', ov); if (!box || !u || ov._ai !== i) return;
    $('.gimg', box).src = u; $('.gbg', box).src = u;
    box.classList.remove('fade'); void box.offsetWidth; box.classList.add('fade');
  });
}
function azkarList(set) {
  const L = S.content.sets[set] !== false ? (S.azkar[set] || []).filter(x => x.on !== false && x.t) : [];
  return L.length ? L : [{ t: '' }];
}

/* ---------- gallery ----------
   Two slides are stacked; each change animates the incoming slide with a (random) effect,
   and the visible picture drifts slowly (Ken Burns). */
const GAL_FX = ['fade', 'slideL', 'slideR', 'slideU', 'slideD', 'zoomIn', 'zoomOut', 'circle', 'wipeL', 'wipeR', 'wipeD', 'blur', 'rotate', 'flip', 'diamond'];
const Gal = { urls: [], key: '', cur: -1, top: 0, lastFx: '', order: [], round: -1 };
async function refreshGallery(force) {
  const ids = S.galleries.filter(g => g.on).reduce((a, g) => a.concat(g.imgs), []);
  const k = ids.join(','); if (k === Gal.key && !force) return; Gal.key = k;
  Gal.urls = (await Promise.all(ids.map(id => DB.url(id)))).filter(Boolean);
  Gal.cur = -1; Gal.round = -1;
  $('#gal').innerHTML = `<div class="gslide" data-i="0"><img class="gbg" alt=""><img class="gimg" alt=""></div><div class="gslide" data-i="1"><img class="gbg" alt=""><img class="gimg" alt=""></div><div class="gchip num hide"></div><div class="gdate num hide"></div>`;
}
/* order of pictures for a round (shuffled per round when asked) */
function galIndex(gt) {
  const n = Gal.urls.length, per = Math.max(3, +S.gallery.sec || 10) * 1000, step = Math.floor(gt / per), round = Math.floor(step / n);
  if (!S.gallery.shuffle) return step % n;
  if (round !== Gal.round) {
    Gal.round = round; let seed = round * 9301 + 49297; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    Gal.order = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [Gal.order[i], Gal.order[j]] = [Gal.order[j], Gal.order[i]]; }
  }
  return Gal.order[step % n];
}
function showSlide(idx, first) {
  const g = $('#gal'), slides = $$('.gslide', g); if (slides.length < 2) return;
  const G = S.gallery, url = Gal.urls[idx], inc = slides[first ? Gal.top : 1 - Gal.top], out = slides[first ? 1 - Gal.top : Gal.top];
  let fx = G.fx === 'random' || !G.fx ? GAL_FX[Math.floor(Math.random() * GAL_FX.length)] : G.fx;
  if (G.fx === 'random' && fx === Gal.lastFx) fx = GAL_FX[(GAL_FX.indexOf(fx) + 3) % GAL_FX.length];
  if (first) fx = 'fade';
  Gal.lastFx = fx;
  const dur = Math.max(0.3, Math.min(4, +G.fxSec || 1.2));
  const im = $('.gimg', inc), bg = $('.gbg', inc);
  im.src = url; bg.src = G.fit === 'blur' ? url : '';
  inc.className = `gslide fit-${G.fit || 'blur'}`; void inc.offsetWidth;
  inc.style.animationDuration = dur + 's';
  inc.className = `gslide fit-${G.fit || 'blur'} on top fx-${fx}`;
  out.classList.remove('top');
  im.className = 'gimg' + (G.kenburns ? ' kb kb' + (1 + Math.floor(Math.random() * 4)) : '');
  im.style.animationDuration = (Math.max(3, +G.sec || 10) + dur + 1) + 's';
  clearTimeout(Gal.t); Gal.t = setTimeout(() => { out.classList.remove('on'); }, dur * 1000 + 50);
  Gal.top = +inc.dataset.i;
}
function renderGallery(mode, t, ph, gt) {
  const g = $('#gal'), n = Gal.urls.length;
  if (!mode || !n) { if (g.classList.contains('on')) { g.classList.remove('on'); Gal.cur = -1; $$('.gslide', g).forEach(x => x.classList.remove('on', 'top')); } return false; }
  const first = !g.classList.contains('on');
  g.classList.add('on');
  const idx = galIndex(gt != null ? gt : t.getTime());
  if (idx !== Gal.cur) { Gal.cur = idx; showSlide(idx, first); }
  const chip = $('.gchip', g);
  if (mode === 'countdown' && ph.target) { chip.classList.remove('hide'); setText(chip, `${PN(ph.P.name)}  ${fmtDur((ph.target - t) / 1000)}`); }
  else if (mode === 'idle' && S.gallery.info) { const np = nextPrayer(t); chip.classList.remove('hide'); setText(chip, `${fmtT(t)}${np ? `  •  ${PN(np.name)} ${fmtT(np.adhan)}` : ''}`); }
  else chip.classList.add('hide');
  const gd = $('.gdate', g);
  if (S.dateOnGallery) { gd.classList.remove('hide'); const d = dateLines(t); setText(gd, [d.day, d.hijri, d.greg].filter(Boolean).join('  •  ')); } else gd.classList.add('hide');
  return true;
}
/* automatic gallery: starts `idleSec` after the last mouse / remote / settings use, shows for a while,
   then the main screen for `everyMin` minutes, and so on; stops before the adhan and for any input */
function autoGalleryTime(t, ph) {
  const G = S.gallery, n = Gal.urls.length;
  if (!G.auto || !n || PREVIEW || settingsOpen || pairVisible() || ph.ph !== 'normal') return null;
  const np = nextPrayer(t); if (np && np.adhan - t < Math.max(0, +G.stopBefore || 0) * MIN) return null;
  const elapsed = Date.now() - (lastInput + Math.max(2, +G.idleSec || 10) * 1000);
  if (elapsed < 0) return null;
  const per = Math.max(3, +G.sec || 10) * 1000, showMs = +G.showMin > 0 ? +G.showMin * MIN : n * per, gapMs = Math.max(0, +G.everyMin || 0) * MIN;
  if (!gapMs) return elapsed;
  const cyc = showMs + gapMs, r = elapsed % cyc;
  return r < showMs ? Math.floor(elapsed / cyc) * showMs + r : null;
}
let galAutoOn = false;

/* ---------- screensaver ---------- */
let lastInput = Date.now();
function saverActive(t, ph, sc) {
  const V = S.saver; if (!V.on || settingsOpen) return false;
  if (Date.now() - lastInput < 60000) return false;
  if (ph.ph === 'prayer' && V.mode === 'during') return true;
  if (ph.ph !== 'normal') return false;
  const mins = t.getHours() * 60 + t.getMinutes();
  const inWin = (a, b) => { const A = atTime(t, a), B = atTime(t, b); if (!A || !B) return false; const am = A.getHours() * 60 + A.getMinutes(), bm = B.getHours() * 60 + B.getMinutes(); return am <= bm ? mins >= am && mins < bm : mins >= am || mins < bm; };
  if (V.idle && Date.now() - lastInput > V.idleMin * MIN) return true;
  if (V.mode === 'between') {
    // last prayer end before now and next adhan after now
    const cands = [];
    for (const d of [new Date(t.getTime() - DAY), t]) { const s = schedule(d); for (const k of PRAYERS5) cands.push(s[k].azkarEnd); }
    const last = cands.filter(x => x <= t).sort((a, b) => b - a)[0]; const np = nextPrayer(t);
    if (!last || !np) return false;
    return t >= addMin(last, +V.startAfter) && t <= addMin(np.adhan, -V.stopBefore);
  }
  if (V.mode === 'interval') { const c = +V.onMin + +V.offMin; return c > 0 && (mins % c) < +V.onMin; }
  if (V.mode === 'timedInterval') { if (!inWin(V.at, V.to)) return false; const A = atTime(t, V.at); let el = Math.floor((t - A) / MIN); if (el < 0) el += 1440; const c = +V.onMin + +V.offMin; return c > 0 && el % c < +V.onMin; }
  if (V.mode === 'window') return inWin(V.from, V.to);
  return false;
}
function renderSaver(on, t) {
  const sv = $('#saver');
  if (!on) { sv.classList.remove('on'); return; }
  if (!sv.classList.contains('on')) { sv.classList.add('on'); sv.innerHTML = '<div class="sv"><div class="st num"></div><div class="sd sdh num"></div><div class="sd sdg num"></div></div>'; }
  sv.className = 'layer on ' + S.saver.size + (S.saver.move ? ' moving' : '');
  const box = $('.sv', sv);
  box.classList.toggle('hide', S.saver.look === 'black');
  setText($('.st', sv), fmtT(t));
  const d = dateLines(t, schedule(t), true), withDate = S.saver.look === 'timedate';
  // the day name with the Hijri date on one line, the Gregorian date on the next
  setText($('.sdh', sv), withDate ? [d.day, d.hijri].filter(Boolean).join('  •  ') : '');
  setText($('.sdg', sv), withDate ? (d.greg || '') : '');
  if (!S.saver.move) { box.style.left = '50%'; box.style.top = '50%'; box.style.transform = 'translate(-50%, -50%)'; box._m = ''; return; }
  // optional slow drift every minute (protects older panels); never leaves the screen
  const m = t.getMinutes() + t.getHours() * 60;
  const key = m + '|' + box.textContent.length;
  if (box._m !== key) {
    box._m = key;
    const W = sv.clientWidth || 1920, H = sv.clientHeight || 1080, bw = box.offsetWidth || 1, bh = box.offsetHeight || 1;
    const s = Math.min(1, (W * 0.94) / bw, (H * 0.94) / bh);
    box.style.transform = `translate(-50%, -50%) scale(${s})`;
    const mx = Math.min(50, (bw * s / 2) / W * 100 + 2), my = Math.min(50, (bh * s / 2) / H * 100 + 2);
    const r = (a) => (Math.sin(m * a) + 1) / 2;
    box.style.left = (mx + (100 - 2 * mx) * r(1.7)) + '%'; box.style.top = (my + (100 - 2 * my) * r(2.3)) + '%';
  }
}

/* ---------- mosque name ---------- */
async function renderName(visible) {
  const N = S.name, L = $('#nameLayer');
  const useImg = N.mode !== 'text' && N.img, useText = N.mode !== 'image' || !N.img;
  const nameFlag = flagOn('name'), cornerFlag = flagOn('corner');
  if (!visible || (!(useText && (N.l1 || N.l2)) && !useImg && !nameFlag && !cornerFlag)) { L.innerHTML = ''; L._k = ''; return; }
  const k = JSON.stringify([N, S.font, S.design, stageDim, S.lang, S.flag]);
  if (L._k === k || L._busy === k) return; L._busy = k;
  let logo = '';
  if (useImg) {
    const url = await DB.url(N.img);
    if (url) {
      const sz = await imgSize(url), h = Math.max(30, +N.imgH || 150), w = Math.round(h * sz.w / sz.h);
      const tc = tintColor(N.imgTint, N.imgColor);
      logo = tc ? `<div class="nlogo" style="width:${w}px;height:${h}px;${maskCss(url, tc)}"></div>` : `<img class="nlogo" src="${url}" style="width:${w}px;height:${h}px" alt="">`;
    }
  }
  L._busy = ''; L._k = k;
  // flag beside the name (before/after in reading order) or in a top corner
  const fh = Math.round((+N.size || 74) * 1.15 * FLAG_H[S.flag.size || 'm']);
  const fS = nameFlag && S.flag.pos === 'name-start' ? flagImg('nflag', fh + 'px') : '', fE = nameFlag && S.flag.pos === 'name-end' ? flagImg('nflag', fh + 'px') : '';
  const corner = cornerFlag ? `<div class="cflag ${S.flag.pos}">${flagImg('', Math.round(96 * FLAG_H[S.flag.size || 'm']) + 'px')}</div>` : '';
  const wrap = inner => `${corner}<div class="nm">${fS}${inner ? `<div class="nmc">${inner}</div>` : ''}${fE}</div>`;
  if (!useText || !(N.l1 || N.l2)) {
    L.innerHTML = wrap(logo);
    return placeName(L, $('.nm', L), null);
  }
  const c = colors(), fill = N.color || c.p, t = tpl();
  const lines = [[N.l1, +N.size], [N.l2, +N.size2]].filter(x => x[0]);
  let y = 0; const tx = [];
  lines.forEach(([s, sz], i) => { y += i ? lines[0][1] * 0.55 + sz : sz; tx.push({ s, sz, y }); });
  const dash = { dashed: `stroke-dasharray="${N.strokeW * 3} ${N.strokeW * 2}"`, dotted: `stroke-dasharray="0.1 ${N.strokeW * 2.2}" stroke-linecap="round"` }[N.stroke] || '';
  const font = `font-family="${S.font.text === 'system-ui' ? 'system-ui' : S.font.text}" font-weight="800" text-anchor="middle" paint-order="stroke"`;
  const textEls = tx.map(l => {
    const base = `x="0" y="${l.y}" font-size="${l.sz}" ${font}`;
    const w = +N.strokeW;
    if (N.stroke === 'double') return `<text ${base} fill="none" stroke="${N.strokeColor}" stroke-width="${w * 5}" stroke-linejoin="round">${esc(l.s)}</text><text ${base} fill="none" stroke="${t.bg1}" stroke-width="${w * 3}" stroke-linejoin="round">${esc(l.s)}</text><text ${base} fill="${fill}" stroke="${N.strokeColor}" stroke-width="${w}" stroke-linejoin="round">${esc(l.s)}</text>`;
    if (N.stroke === 'none') return `<text ${base} fill="${fill}">${esc(l.s)}</text>`;
    return `<text ${base} fill="${fill}" stroke="${N.strokeColor}" stroke-width="${w * 2}" stroke-linejoin="round" ${dash}>${esc(l.s)}</text>`;
  }).join('');
  const sh = N.shadow.on ? `filter:drop-shadow(${N.shadow.x}px ${N.shadow.y}px ${N.shadow.blur}px ${N.shadow.color})` : '';
  L.innerHTML = wrap(`${logo}<svg><g>${textEls}</g></svg>`);
  if (logo) $('.nmc', L).className = 'nmc with-logo ' + (N.imgSide === 'start' ? 'row' : 'col');
  const nm = $('.nm', L), svg = $('svg', L), g = $('g', L);
  requestAnimationFrame(() => {
    let bb; try { bb = g.getBBox(); } catch (e) { bb = { x: -400, y: 0, width: 800, height: y }; }
    const padX = 10, padY = 6;
    const vw = bb.width + padX * 2, vh = bb.height + padY * 2;
    svg.setAttribute('width', vw); svg.setAttribute('height', vh); svg.setAttribute('viewBox', `${bb.x - padX} ${bb.y - padY} ${vw} ${vh}`);
    svg.style.cssText = sh;
    placeName(L, nm);
  });
}
/* scale the whole name block (logo + text) to the space it may use, then place it */
function placeName(L, nm) {
  const N = S.name;
  requestAnimationFrame(() => {
    if (N.bg.on) { nm.style.background = hexA(N.bg.color, N.bg.op); nm.style.borderRadius = '24px'; nm.style.padding = '12px 34px'; } else { nm.style.background = 'none'; nm.style.padding = '0'; }
    nm.style.transform = ''; nm.style.transformOrigin = '0 0';
    const W = stageDim.W, H = stageDim.H, m = 24;
    const want = Math.max(0.4, Math.min(2, (+N.scale || 100) / 100));
    const maxH = (N.pos[0] === 'm' ? H * 0.45 : (stageDim.port ? 340 : 300)) * Math.max(1, want);
    const cf = $('.cflag', L), cfw = cf ? cf.offsetWidth : 0, cfh = cf ? cf.offsetHeight : 0;
    const reserve = cf ? 2 * (cfw + 150) : 240;      // keep the name clear of a corner flag
    const sc = nm.offsetWidth ? Math.min(want, (W - reserve) / nm.offsetWidth, maxH / nm.offsetHeight) : 1;
    if (sc !== 1) nm.style.transform = `scale(${sc})`;
    const w = nm.offsetWidth * sc, h = nm.offsetHeight * sc;
    const v = N.pos[0], hz = N.pos[1];
    const rtl = S.lang === 'ar';
    let x = hz === 'c' ? (W - w) / 2 : ((hz === 's') === rtl ? W - w - m : m);
    let yy = v === 't' ? m : v === 'm' ? (H - h) / 2 : H - h - 90;
    nm.style.left = (x + +N.dx) + 'px'; nm.style.top = (yy + +N.dy) + 'px';
    const st = $('#stage');
    const bottomOfTop = Math.max(v === 't' && h ? yy + +N.dy + h : 0, cf ? 24 + cfh : 0);
    if (bottomOfTop) st.style.setProperty('--toph', Math.max(110, Math.min(stageDim.port ? 620 : 520, bottomOfTop + 10)) + 'px'); else st.style.removeProperty('--toph');
    refitAll();
  });
}


/* ---------- temperature ---------- */
const Temp = { v: null, at: 0 };
async function refreshTemp() {
  return refreshWeather();
  try { if (Native && Native.getTemperature) { const v = parseFloat(Native.getTemperature()); if (!isNaN(v)) { Temp.v = v; return; } } } catch (e) { }
  if (Date.now() - Temp.at < 25 * MIN) return; Temp.at = Date.now();
  try { const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${S.loc.lat}&longitude=${S.loc.lng}&current=temperature_2m`); const j = await r.json(); Temp.v = j.current.temperature_2m; } catch (e) { }
}

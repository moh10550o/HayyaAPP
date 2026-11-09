/* ================= App: main loop & boot ================= */
const APP_VERSION = '1.0.11';
const fired = new Set();

function applyAll() {
  invalidate();
  stageDim = layoutStage(); themeKey = activeTplId(); applyDevice();
  buildMain(); applyTheme(); refreshGallery();
  tickKey = ''; ovKey = ''; $('#nameLayer')._k = '';
  // settings size unit: landscape screens scale from 1280×720; portrait screens and phones from 720×1280
  const portU = innerWidth < innerHeight;
  const u = portU ? Math.max(13, Math.min(innerWidth / 720, innerHeight / 1280) * 16) : Math.max(11, Math.min(innerWidth / 1280, innerHeight / 720) * 16);
  document.documentElement.style.setProperty('--u', u + 'px');
  if (settingsOpen) { renderNav(); rerender(); }
}

/* builds a fake phase for the preview buttons */
function forcedPhase(t, sc) {
  const k = forced.k, P = nextPrayer(t) || sc.dhuhr, from = new Date(t.getTime() - 2000);
  if (k === 'main') return { ph: 'normal', prio: 0 };
  if (k === 'waitPage') return { ph: 'countdown', P, from: new Date(t.getTime() - 300000), target: new Date(t.getTime() + 437000), prio: 1, forceTip: true };
  if (k === 'countdown') return { ph: 'countdown', P, from: new Date(t.getTime() - 300000), target: new Date(t.getTime() + 437000), prio: 1 };
  if (k === 'azkar') return { ph: 'azkar', P, set: 'after', from, to: new Date(t.getTime() + 12000) };
  if (k === 'morning') return { ph: 'azkar', set: 'morning', from, to: new Date(t.getTime() + 12000) };
  if (k === 'khutbah') return { ph: 'khutbah', P: Object.assign({}, sc.dhuhr, { name: 'jumuah', jumuah: true }), from };
  if (k === 'taraweeh') return { ph: 'special', kind: 'taraweeh', ann: 60, from };
  if (k === 'gallery' || k === 'saver' || k === 'hadithPage') return { ph: 'normal', prio: 0 };
  return { ph: k, P, from };
}

function soundCheck(t, sc) {
  for (const k of PRAYERS5) {
    const P = sc[k];
    const ida = sc.key + k + 'a', idi = sc.key + k + 'i';
    const pp = prayerSound(P);
    if (S.sound.adhan.on && pp.on && t >= P.adhan && t - P.adhan < 90000 && !fired.has(ida)) { fired.add(ida); playAdhan(P); }
    if (S.sound.iqama.on && pp.iq !== false && t >= P.iqama && t - P.iqama < 90000 && !fired.has(idi)) { fired.add(idi); Sound.play(S.sound.iqama, S.sound.iqama.media, pp.vol / 100); }
  }
  if (fired.size > 40) fired.clear();
}

let lastDay = '';
function frame() {
  try {
    const t = now(), sc = schedule(t);
    if (forced && Date.now() > forced.until) forced = null;
    if (sc.key !== lastDay) { lastDay = sc.key; S.notices = S.notices.filter(n => !n.until || new Date(n.until) > t); }
    if (!forced && !PREVIEW) { soundCheck(t, sc); relayTick(t, sc); }
    themeTick();
    const ph = forced ? forcedPhase(t, sc) : phaseAt(t);
    if (!PREVIEW) micTick(t, ph);
    const ovRes = renderOverlay(ph, t, sc);
    let gmode = null;
    if (forced && forced.k === 'gallery') gmode = 'idle';
    else if (ph.ph === 'countdown' && S.gallery.between) gmode = 'countdown';
    else if (ovRes === 'khutbahGallery') gmode = 'khutbah';
    let gt = null;
    if (!gmode && !forced) { gt = autoGalleryTime(t, ph); if (gt != null) gmode = 'idle'; }
    galAutoOn = gmode === 'idle' && !forced;
    const galOn = renderGallery(gmode, t, ph, gt);
    const sav = (forced && forced.k === 'saver') || ovRes === 'saver' || (!forced && saverActive(t, ph, sc));
    renderSaver(sav, t);
    const normal = ph.ph === 'normal' && !galOn && !sav;
    // the hadith take turns with the prayer-times screen on a page of their own (paused while the settings are open)
    const hpForce = !!(forced && forced.k === 'hadithPage');
    const hp = normal && (hpForce || (!settingsOpen && !forced)) ? hadithPageNow(t, hpForce) : null;
    // between the adhan and the iqamah the texts take turns with the countdown on a page of their own
    const wp = !hp && !galOn && !sav && (!forced || ph.forceTip) && (!settingsOpen || ph.forceTip) ? waitPageNow(t, ph) : null;
    const pg = hp || wp;
    if (pg) pg.noname = (S.name.on || {})[wp ? 'countdown' : 'hadith'] === false;   // the page uses the space of a hidden name
    const hpOn = renderHadithPage(pg, t);
    $('#ov').style.visibility = wp ? 'hidden' : '';
    const mainVisible = normal && !hpOn;
    $('#main').style.visibility = mainVisible ? 'visible' : 'hidden';
    if (mainVisible) { renderMain(t, sc); tickStatic(t); }
    renderTicker(mainVisible || hpOn || (ph.ph === 'countdown' && !galOn));
    const scr = wp ? 'countdown' : hp ? 'hadith' : mainVisible ? 'main' : ['adhan', 'countdown', 'iqama', 'azkar', 'khutbah'].includes(ph.ph) ? ph.ph : 'special';
    const nOn = (S.name.on || {})[scr];
    renderName(!galOn && !sav && (mainVisible || hpOn || ph.ph !== 'normal') && nOn !== false && !$('#ov').classList.contains('azimgmode'));
  } catch (e) { console.error(e); }
}

function boot() {
  loadSettings();
  document.body.insertAdjacentHTML('afterbegin', `<div id="viewport"><div id="stage" class="land">
    <div id="bg" class="layer"></div><div id="bgimg" class="layer"></div><div id="art" class="layer"></div>
    <div id="main" class="layer"></div><div id="hpg" class="layer"></div><div id="ticker"></div>
    <div id="ov" class="layer"></div><div id="gal" class="layer"></div><div id="saver" class="layer"></div>
    <div id="nameLayer" class="layer"></div><button id="brand" tabindex="-1">حَيَّ</button><div id="hint"></div>
  </div></div><div id="toast"></div>`);
  buildSettings();
  applyAll();
  $('#brand').addEventListener('click', e => { e.stopPropagation(); openSettings(); });
  $('#viewport').addEventListener('dblclick', () => openSettings());
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => PermAsk.check(), 2500);   // ask for the missing permissions at every start
  document.addEventListener('pointerdown', () => { lastInput = Date.now(); Sound.unlock(); });
  // any mouse movement counts as use: the automatic gallery closes and waits again
  let lastMove = 0;
  document.addEventListener('pointermove', () => { const n = Date.now(); if (n - lastMove > 250) { lastMove = n; lastInput = n; if (galAutoOn) frame(); } }, { passive: true });
  // a resize caused only by the on-screen keyboard must not rebuild the screen while typing
  let rz, lastW = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(rz);
    if (typeof editing !== 'undefined' && editing && innerWidth === lastW) { keepVisible(editing); return; }
    lastW = innerWidth; rz = setTimeout(applyAll, 200);
  });
  // browsers (HTML version on a phone): the keyboard shrinks the visual viewport
  if (window.visualViewport) visualViewport.addEventListener('resize', () => {
    if (!(typeof Native !== 'undefined' && Native)) window.hayyaKeyboard(Math.max(0, innerHeight - visualViewport.height - (visualViewport.offsetTop || 0)));
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { $('#nameLayer')._k = ''; tickKey = ''; refitAll(); });
  frame(); setInterval(frame, 250);
  // background jobs
  if (S.loc.gpsAuto && navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { S.loc.lat = +p.coords.latitude.toFixed(4); S.loc.lng = +p.coords.longitude.toFixed(4); saveSettings(); }, () => { }, { timeout: 30000 });
  if (PREVIEW) {
    // embedded in the dashboard: settings arrive by postMessage, nothing is synced or played
    $('#brand').classList.add('hide');
    addEventListener('message', e => {
      const d = e.data || {}; if (e.origin !== location.origin && location.protocol !== 'file:') return;
      if (d.type === 'settings') { S = migrate(merge(DEFAULTS, d.settings || {})); invalidate(); applyAll(); }
      if (d.type === 'preview') { forced = d.k ? { k: d.k, until: Date.now() + 15000 } : null; }
      if (d.type === 'time') { S.clockAdjSec = d.offset || 0; }
    });
    parent.postMessage({ type: 'ready' }, location.protocol === 'file:' ? '*' : location.origin);
    return;
  }
  Cloud.start();
  const cst = Cloud.st();
  setTimeout(() => { if (Cloud.server() && !Cloud.st().linked && !localStorage.getItem('hayya_pair_done')) showPair(false, 0); }, 4000);
  setTimeout(() => syncFromUrl(false), 5000);
  setInterval(() => syncFromUrl(false), Math.max(5, +S.sync.everyMin || 30) * MIN);
  refreshTemp(); setInterval(refreshTemp, 60000);
  // keep the screen awake in browsers that support it
  // keep the screen awake in browsers that support it (switchable in the settings)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wakeLockObj = null; applyDevice(); } });
  if (location.hash === '#settings') openSettings();
}
document.addEventListener('DOMContentLoaded', boot);

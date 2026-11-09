/* ================= Activation copies: one activation code built into each APK / HTML copy =================
   APK: the code is added to the APK Signing Block as an extra ID-value pair (ID 0x48594131 "HYA1").
   APK Signature Scheme v2 does not sign that block, so the copy keeps its original signature and installs
   as the same genuine app (v1 JAR signatures are untouched too). The app reads it with ApkStamp.java.
   HTML: the code goes into <meta name="hayya-code" content="…">.
   Used by the admin page of the dashboard (in the browser) and by tools/make-copies.js (Node). */
var HayyaStamp = (function () {
  const STAMP_ID = 0x48594131, PAD_ID = 0x42726577, MAGIC = 'APK Sig Block 42';
  const u32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
  const u64 = (b, o) => u32(b, o) + u32(b, o + 4) * 4294967296;
  const w32 = (b, o, v) => { b[o] = v & 255; b[o + 1] = v >>> 8 & 255; b[o + 2] = v >>> 16 & 255; b[o + 3] = v >>> 24 & 255; };
  const w64 = (b, o, v) => { w32(b, o, v % 4294967296); w32(b, o + 4, Math.floor(v / 4294967296)); };

  function findEocd(a) {
    for (let i = a.length - 22; i >= Math.max(0, a.length - 65557); i--) if (a[i] === 0x50 && a[i + 1] === 0x4b && a[i + 2] === 0x05 && a[i + 3] === 0x06) return i;
    throw new Error('ليس ملف APK صالحًا (لا يوجد فهرس ZIP)');
  }
  /* returns { start, cd, pairs: [{id, value}] } of the signing block */
  function readBlock(a) {
    const eocd = findEocd(a), cd = u32(a, eocd + 16);
    const magic = String.fromCharCode(...a.subarray(cd - 16, cd));
    if (magic !== MAGIC) throw new Error('الملف غير موقّع بنظام التوقيع v2 — استخدم ملف APK الرسمي الموقّع');
    const size = u64(a, cd - 24), start = cd - size - 8;
    const pairs = []; let p = start + 8;
    while (p < cd - 24) { const len = u64(a, p), id = u32(a, p + 8); pairs.push({ id, value: a.slice(p + 12, p + 8 + len) }); p += 8 + len; }
    return { eocd, start, cd, pairs };
  }
  function readApkCode(a) {
    const r = readBlock(a), x = r.pairs.find(q => q.id === STAMP_ID);
    return x ? new TextDecoder().decode(x.value) : '';
  }
  function stampApk(src, code) {
    const a = src instanceof Uint8Array ? src : new Uint8Array(src);
    const r = readBlock(a), hadPad = r.pairs.some(q => q.id === PAD_ID);
    const pairs = r.pairs.filter(q => q.id !== STAMP_ID && q.id !== PAD_ID);
    pairs.push({ id: STAMP_ID, value: new TextEncoder().encode(String(code)) });
    let body = pairs.reduce((n, q) => n + 12 + q.value.length, 0);
    if (hadPad) {   // keep the block a multiple of 4096 bytes, like apksigner does
      let total = body + 8 + 8 + 16, need = (4096 - (total + 12) % 4096) % 4096;
      pairs.push({ id: PAD_ID, value: new Uint8Array(need) }); body += 12 + need;
    }
    const blockSize = body + 8 + 16, blk = new Uint8Array(8 + blockSize);
    w64(blk, 0, blockSize); let p = 8;
    for (const q of pairs) { w64(blk, p, q.value.length + 4); w32(blk, p + 8, q.id); blk.set(q.value, p + 12); p += 12 + q.value.length; }
    w64(blk, p, blockSize); p += 8;
    for (let i = 0; i < 16; i++) blk[p + i] = MAGIC.charCodeAt(i);
    const head = a.subarray(0, r.start), tail = a.slice(r.cd);
    const out = new Uint8Array(head.length + blk.length + tail.length);
    out.set(head, 0); out.set(blk, head.length); out.set(tail, head.length + blk.length);
    const eocd = head.length + blk.length + (r.eocd - r.cd);
    w32(out, eocd + 16, head.length + blk.length);        // the central directory moved
    return out;
  }
  function stampHtml(text, code) {
    const tag = `<meta name="hayya-code" content="${String(code).replace(/[^0-9A-Z-]/gi, '')}">`;
    if (/<meta name="hayya-code" content="[^"]*">/.test(text)) return text.replace(/<meta name="hayya-code" content="[^"]*">/, tag);
    return text.replace(/<head>/i, '<head>\n' + tag);
  }
  /* minimal ZIP (stored) so many copies download as one file */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {   // [{ name, data: Uint8Array }]
    const enc = new TextEncoder(), parts = [], cdir = []; let off = 0;
    for (const f of files) {
      const nm = enc.encode(f.name), crc = crc32(f.data), h = new Uint8Array(30 + nm.length);
      w32(h, 0, 0x04034b50); h[4] = 20; h[6] = 0; h[7] = 8; /* utf-8 names */ w32(h, 14, crc); w32(h, 18, f.data.length); w32(h, 22, f.data.length); h[26] = nm.length & 255; h[27] = nm.length >> 8; h.set(nm, 30);
      const c = new Uint8Array(46 + nm.length);
      w32(c, 0, 0x02014b50); c[4] = 20; c[6] = 20; c[9] = 8; w32(c, 16, crc); w32(c, 20, f.data.length); w32(c, 24, f.data.length); c[28] = nm.length & 255; c[29] = nm.length >> 8; w32(c, 42, off); c.set(nm, 46);
      parts.push(h, f.data); cdir.push(c); off += h.length + f.data.length;
    }
    const cdSize = cdir.reduce((n, c) => n + c.length, 0), e = new Uint8Array(22);
    w32(e, 0, 0x06054b50); e[8] = e[10] = files.length & 255; e[9] = e[11] = files.length >> 8; w32(e, 12, cdSize); w32(e, 16, off);
    return new Blob([...parts, ...cdir, e], { type: 'application/zip' });
  }
  return { stampApk, readApkCode, stampHtml, zip };
})();
if (typeof module !== 'undefined') module.exports = HayyaStamp;

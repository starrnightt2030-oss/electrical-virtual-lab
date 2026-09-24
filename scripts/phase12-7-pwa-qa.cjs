const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const vite = read('vite.config.ts');
const index = read('index.html');
const main = read('src/main.tsx');

assert(vite.includes('VitePWA'), 'VitePWA plugin missing');
assert(vite.includes("registerType: 'autoUpdate'"), 'autoUpdate registration missing');
assert(vite.includes("navigateFallback: '/index.html'"), 'offline navigation fallback missing');
assert(vite.includes('cleanupOutdatedCaches: true'), 'outdated cache cleanup missing');
assert(vite.includes('clientsClaim: true'), 'clientsClaim missing');
assert(vite.includes('skipWaiting: true'), 'skipWaiting missing');
assert(vite.includes("'/icons/pwa-192.png'"), '192px icon missing from PWA config');
assert(vite.includes("'/icons/pwa-512.png'"), '512px icon missing from PWA config');
assert(vite.includes("lang: 'ar'"), 'Arabic manifest language missing');
assert(vite.includes("dir: 'rtl'"), 'RTL manifest direction missing');
assert(vite.includes("display: 'standalone'"), 'standalone display missing');
assert(vite.includes("scope: '/'"), 'PWA scope missing');
assert(vite.includes("start_url: '/'"), 'PWA start_url missing');
assert(main.includes("registerSW({ immediate: true })"), 'service worker registration missing');
assert(index.includes('mobile-web-app-capable'), 'Android standalone meta missing');
assert(index.includes('apple-mobile-web-app-capable'), 'iOS standalone meta missing');
assert(index.includes('/icons/pwa-192.png'), 'icon link missing from index');
for (const [file, expected] of [['public/icons/pwa-192.png',192],['public/icons/pwa-512.png',512]]) {
  const buf = fs.readFileSync(path.join(root,file));
  assert(buf.slice(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${file} is not PNG`);
  // PNG IHDR dimensions
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  assert(w === expected && h === expected, `${file} dimensions are ${w}x${h}, expected ${expected}x${expected}`);
}
console.log('PHASE12_7_PWA_STATIC_QA_OK');

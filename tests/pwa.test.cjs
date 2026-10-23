const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('manifest has stable standalone PWA contract', () => {
  const manifest = JSON.parse(read('site.webmanifest'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.name, 'NortFood');
  assert.equal(manifest.short_name, 'NortFood');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#ffffff');
  assert.equal(manifest.theme_color, '#ffffff');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'maskable'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
});

test('HTML declares install metadata and PWA bootstrap', () => {
  const html = read('index.html');
  assert.match(html, /rel="manifest" href="\/site\.webmanifest"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /pwa\.js/);
});

test('service worker excludes authenticated and Supabase traffic from caching', () => {
  const sw = read('sw.js');
  assert.match(sw, /authorization/);
  assert.match(sw, /supabase\.co/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /CACHE_VERSION/);
});

test('build copies PWA files', () => {
  const build = read('scripts/build.cjs');
  for (const file of ['pwa.css', 'pwa.js', 'sw.js']) assert.match(build, new RegExp(file.replace('.', '\\.'), 'g'));
});

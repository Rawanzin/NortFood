// Theme changes affect presentation only; forms, sessions and cart stay in place.
(() => {
  const key = 'nortfood-theme';
  const device = matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch {}
  const selected = () => ['light', 'dark'].includes(preference) ? preference : device.matches ? 'dark' : 'light';
  function sync() {
    const theme = selected();
    document.documentElement.dataset.theme = theme;
    // Stop browser Auto Dark from repainting an explicitly selected light palette.
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', 'only ' + theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#18191c' : '#ffffff');
    document.querySelectorAll('[data-brand-logo]').forEach(img => {
      const asset = new URL('assets/optimized/logo-' + theme + '.webp', location.href);
      asset.hash = ''; asset.search = '';
      // All application documents live at the site root, including the 404 page.
      const source = location.protocol === 'file:' ? asset.href : '/assets/optimized/logo-' + theme + '.webp';
      if (img.getAttribute('src') !== source) img.src = source;
    });
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-label', theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro');
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.textContent = theme === 'dark' ? '☀' : '☾';
    });
  }
  window.NortFoodTheme = Object.freeze({sync});
  sync();
  document.addEventListener('DOMContentLoaded', sync, {once:true});
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    preference = selected() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, preference); } catch {}
    sync();
  });
  device.addEventListener('change', sync);
  addEventListener('storage', event => { if (event.key === key) { preference = event.newValue; sync(); } });
})();

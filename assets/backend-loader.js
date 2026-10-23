/* Fetch the SDK without blocking the existing public shell's first render. */
(() => {
  const localDemo = ['localhost','127.0.0.1',''].includes(location.hostname) && new URLSearchParams(location.search).get('demo') === '1';
  if (localDemo || window.NortFoodBackend) {
    window.NortFoodBackendReady = Promise.resolve(window.NortFoodBackend || null);
    return;
  }
  window.NortFoodBackendReady = new Promise((resolve,reject) => {
    const script = document.createElement('script');
    let finished = false;
    const finish = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve(window.NortFoodBackend);
    };
    const timeout = setTimeout(() => finish(new Error('O carregamento da conexão demorou demais. Tente novamente.')),15000);
    script.src = 'assets/nortfood-backend.js';
    script.async = true;
    script.onload = () => finish(window.NortFoodBackend ? null : new Error('Não foi possível iniciar a conexão. Tente novamente.'));
    script.onerror = () => finish(new Error('Não foi possível carregar a conexão. Confira a internet e tente novamente.'));
    document.head.appendChild(script);
  });
  // The application displays the failure. Avoid an early unhandled rejection.
  window.NortFoodBackendReady.catch(() => {});
})();

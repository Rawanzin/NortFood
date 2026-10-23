(() => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOSSafari = isIOS && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
  const preferenceKey = 'nortfood-install-remind-after';
  let remindAfter = 0;
  try { remindAfter = Number(localStorage.getItem(preferenceKey)) || 0; } catch {}
  const postpone = () => {
    remindAfter = Date.now() + 30 * 86400000;
    try { localStorage.setItem(preferenceKey, String(remindAfter)); } catch {}
  };
  let deferredPrompt = null;
  let reloadForUpdate = false;

  const showUpdate = registration => {
    if (!registration.waiting || document.querySelector('.nf-pwa-update')) return;
    const notice = document.createElement('aside');
    notice.className = 'nf-pwa-update';
    notice.setAttribute('role', 'status');
    const message = document.createElement('span');
    message.textContent = '\u0055\u006d\u0061\u0020\u006e\u006f\u0076\u0061\u0020\u0076\u0065\u0072\u0073\u00e3\u006f\u0020\u0064\u006f\u0020\u004e\u006f\u0072\u0074\u0046\u006f\u006f\u0064\u0020\u0065\u0073\u0074\u00e1\u0020\u0070\u0072\u006f\u006e\u0074\u0061\u002e';
    const apply = document.createElement('button');
    apply.type = 'button'; apply.dataset.applyUpdate = '';
    apply.textContent = '\u0041\u0074\u0075\u0061\u006c\u0069\u007a\u0061\u0072';
    const later = document.createElement('button');
    later.type = 'button'; later.className = 'nf-pwa-later';
    later.textContent = '\u0044\u0065\u0070\u006f\u0069\u0073';
    const hint = document.createElement('small');
    hint.textContent = '\u0043\u006f\u006e\u0063\u006c\u0075\u0061\u0020\u006f\u0075\u0020\u0073\u0061\u006c\u0076\u0065\u0020\u0066\u006f\u0072\u006d\u0075\u006c\u00e1\u0072\u0069\u006f\u0073\u0020\u0061\u006e\u0074\u0065\u0073\u0020\u0064\u0065\u0020\u0061\u0074\u0075\u0061\u006c\u0069\u007a\u0061\u0072\u002e';
    notice.append(message, apply, later, hint);
    notice.querySelector('.nf-pwa-later').addEventListener('click', () => notice.remove());
    notice.querySelector('[data-apply-update]').addEventListener('click', () => {
      if (document.querySelector('form[aria-busy="true"]')) {
        notice.querySelector('small').textContent = 'Aguarde a confirmação da operação em andamento e toque em Atualizar.';
        return;
      }
      reloadForUpdate = true;
      registration.waiting?.postMessage({type: 'SKIP_WAITING'});
    });
    document.body.appendChild(notice);
  };

  const addStyles = () => {
    if (document.getElementById('nortfood-pwa-inline-style')) return;
    const style = document.createElement('style');
    style.id = 'nortfood-pwa-inline-style';
    style.textContent = '.nf-pwa-install{position:fixed;right:16px;bottom:16px;z-index:1000;display:flex;align-items:center;gap:10px;max-width:min(380px,calc(100vw - 32px));padding:12px 14px;border:1px solid #f0d4d7;border-radius:14px;background:#fff;box-shadow:0 12px 32px #1a1b2322;color:#24252a;font:600 13px DM Sans,sans-serif}.nf-pwa-install button{border:0;border-radius:9px;background:#e82e3c;color:#fff;padding:9px 12px;font-weight:700;cursor:pointer}.nf-pwa-install .nf-pwa-close{background:#fff0f1;color:#c91e2c;padding:7px 9px}.nf-pwa-modal{position:fixed;inset:0;z-index:1001;display:grid;place-items:center;padding:18px;background:#17181b78}.nf-pwa-card{width:min(410px,100%);padding:22px;border-radius:18px;background:#fff;box-shadow:0 20px 60px #0003}.nf-pwa-card h2{margin:0 0 8px;font:800 20px Manrope,sans-serif}.nf-pwa-card p{color:#777980;line-height:1.55;font-size:13px}.nf-pwa-card button{border:0;border-radius:9px;background:#e82e3c;color:#fff;padding:11px 15px;font-weight:700;cursor:pointer}';
    document.head.appendChild(style);
  };

  const showIOSInstructions = () => {
    addStyles();
    const modal = document.createElement('div');
    modal.className = 'nf-pwa-modal';
    modal.innerHTML = '<section class="nf-pwa-card" role="dialog" aria-modal="true" aria-label="Instalar NortFood"><h2>Instalar NortFood</h2><p>No iPhone ou iPad, toque em <strong>Compartilhar</strong> no Safari e depois em <strong>Adicionar à Tela de Início</strong>.</p><button type="button">Entendi</button></section>';
    modal.addEventListener('click', event => { if (event.target === modal || event.target.tagName === 'BUTTON') modal.remove(); });
    document.body.appendChild(modal);
  };

  const showInstall = () => {
    if (isStandalone || Date.now() < remindAfter || document.querySelector('.nf-pwa-install')) return;
    addStyles();
    const bar = document.createElement('aside');
    bar.className = 'nf-pwa-install';
    bar.setAttribute('aria-label', 'Instalar NortFood');
    bar.innerHTML = '<span>Tenha o NortFood na sua tela inicial.</span><button type="button" class="nf-pwa-install-action">Instalar</button><button type="button" class="nf-pwa-close" aria-label="Fechar">×</button>';
    bar.querySelector('.nf-pwa-install-action').addEventListener('click', async () => {
      if (deferredPrompt) {
        const prompt = deferredPrompt;
        deferredPrompt = null;
        try {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice.outcome !== 'accepted') postpone();
        } catch { postpone(); }
        finally { bar.remove(); }
      } else if (isIOSSafari) { postpone(); bar.remove(); showIOSInstructions(); }
    });
    bar.querySelector('.nf-pwa-close').addEventListener('click', () => { postpone(); bar.remove(); });
    document.body.appendChild(bar);
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    showInstall();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; document.querySelector('.nf-pwa-install')?.remove(); });

  document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadForUpdate) location.reload();
      });
      navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'}).then(registration => {
        showUpdate(registration);
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', event => {
            if (event.target.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
          });
        });
        // Check again when a long-running seller panel returns to the foreground.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
      }).catch(() => {});
    }
    if (!isStandalone && isIOSSafari) showInstall();
  });
})();

/* Installation stays user initiated; the public service worker never caches accounts. */
(() => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOSSafari = isIOS && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios/i.test(navigator.userAgent);
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const preferenceKey = 'nortfood-install-remind-after';
  let remindAfter = 0, deferredPrompt = null, installed = false, prompting = false, reloadForUpdate = false;
  try { remindAfter = Number(localStorage.getItem(preferenceKey)) || 0; } catch {}
  const standalone = () => installed || displayMode.matches || navigator.standalone === true;
  const postpone = () => {
    remindAfter = Date.now() + 30 * 86400000;
    try { localStorage.setItem(preferenceKey, String(remindAfter)); } catch {}
  };

  function sync() {
    const hidden = standalone();
    for (const row of document.querySelectorAll('[data-pwa-install]')) {
      row.hidden = hidden;
      row.disabled = prompting;
    }
    const slot = document.querySelector('[data-pwa-home]');
    const available = !hidden && Date.now() >= remindAfter && (deferredPrompt || isIOSSafari);
    if (!available) { slot?.replaceChildren(); return; }
    if (slot && !slot.firstElementChild) {
      slot.innerHTML = '<aside class="nf-pwa-install" aria-label="Instalar NortFood"><span>Peça com mais facilidade pelo app NortFood.</span><button type="button" data-pwa-install class="nf-pwa-install-action">Instalar app</button><button type="button" class="nf-pwa-close" data-pwa-dismiss aria-label="Dispensar convite de instalação">×</button></aside>';
    }
    slot?.querySelectorAll('[data-pwa-install]').forEach(button => { button.disabled = prompting; });
  }

  function showInstructions() {
    if (document.querySelector('.nf-pwa-modal') || standalone()) return;
    const previous = document.activeElement;
    const modal = document.createElement('div');
    modal.className = 'nf-pwa-modal';
    let text;
    if (isIOSSafari) text = '<p>No Safari do iPhone ou iPad:</p><ol><li>Toque no botão <strong>Compartilhar</strong>.</li><li>Escolha <strong>Adicionar à Tela de Início</strong>. Se necessário, role a lista de ações.</li><li>Confirme em <strong>Adicionar</strong>.</li></ol>';
    else if (isIOS) text = '<p>Para instalar, abra este site no <strong>Safari</strong>. Toque em <strong>Compartilhar</strong> e escolha <strong>Adicionar à Tela de Início</strong>.</p>';
    else if (/android/i.test(navigator.userAgent)) text = '<p>Abra o menu do navegador e procure <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>. A opção depende do navegador e da disponibilidade da instalação.</p>';
    else text = '<p>No Chrome ou Edge, procure o ícone de instalação na barra de endereços ou a opção <strong>Instalar NortFood</strong> no menu. Se a opção não aparecer, continue usando o site ou abra em um navegador compatível.</p>';
    modal.innerHTML = '<section class="nf-pwa-card" role="dialog" aria-modal="true" aria-labelledby="nf-pwa-title" aria-describedby="nf-pwa-description"><h2 id="nf-pwa-title">Instalar NortFood</h2><div id="nf-pwa-description">'+text+'<p>O NortFood será adicionado à sua tela inicial quando você concluir a instalação no navegador.</p></div><button type="button" data-pwa-close>Entendi</button></section>';
    const close = () => { modal.remove(); if (previous?.isConnected) previous.focus(); };
    modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-pwa-close]')) close(); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === 'Tab') { event.preventDefault(); modal.querySelector('button').focus(); }
    });
    document.body.appendChild(modal);
    modal.querySelector('button').focus();
  }

  async function install() {
    if (standalone() || prompting) return;
    if (!deferredPrompt) { showInstructions(); return; }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    prompting = true;
    sync();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome !== 'accepted') postpone();
    } catch { showInstructions(); }
    finally { prompting = false; sync(); }
  }

  window.NortFoodPWA = Object.freeze({sync, install});
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (!standalone()) deferredPrompt = event;
    sync();
  });
  window.addEventListener('appinstalled', () => {
    installed = true; deferredPrompt = null;
    document.querySelector('.nf-pwa-modal')?.remove();
    sync();
  });
  displayMode.addEventListener?.('change', sync);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-pwa-dismiss]')) { postpone(); sync(); }
    else if (event.target.closest('[data-pwa-install]')) install();
  });

  const showUpdate = registration => {
    if (!registration.waiting || document.querySelector('.nf-pwa-update')) return;
    const notice = document.createElement('aside');
    notice.className = 'nf-pwa-update';
    notice.setAttribute('role', 'status');
    notice.innerHTML = '<span>Uma nova versão do NortFood está pronta.</span><button type="button" data-apply-update>Atualizar</button><button type="button" class="nf-pwa-later">Depois</button><small>Conclua ou salve formulários antes de atualizar.</small>';
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

  document.addEventListener('DOMContentLoaded', () => {
    sync();
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
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
      }).catch(() => {});
    }
  });
})();

// One polling timer and one channel per active authenticated identity.
// Guests never consume a Realtime connection. Background tabs stop polling.
export function createLiveUpdates({client, getUser, notify, document, window, navigator, setInterval, clearInterval}) {
  let timer = null, channel = null, active = false;
  const refresh = event => {
    if (document.visibilityState === 'hidden' || navigator.onLine === false) return;
    Promise.resolve(notify(event)).catch(() => {});
  };
  function release() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    if (channel) { Promise.resolve(client.removeChannel(channel)).catch(() => {}); channel = null; }
  }
  function restart() {
    release();
    if (!active || document.visibilityState === 'hidden' || navigator.onLine === false) return;
    const user = getUser();
    if (user) {
      channel = client.channel('nortfood-events-' + user.id);
      for (const table of ['orders','messages','notifications','dining_tables']) {
        channel = channel.on('postgres_changes',{event:'*',schema:'public',table},() => refresh('DATABASE_CHANGE'));
      }
      channel.subscribe();
    }
    timer = setInterval(() => refresh('POLL'), user ? 20000 : 60000);
  }
  const resume = () => { restart(); refresh('POLL'); };
  const pageShow = event => { if (event.persisted) resume(); };
  return {
    start() {
      if (!active) {
        active = true;
        document.addEventListener('visibilitychange',resume);
        window.addEventListener('online',resume);
        window.addEventListener('offline',restart);
        window.addEventListener('pagehide',release);
        window.addEventListener('pageshow',pageShow);
      }
      restart();
    },
    identityChanged: restart,
    stop() {
      active = false; release();
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('online',resume);
      window.removeEventListener('offline',restart);
      window.removeEventListener('pagehide',release);
      window.removeEventListener('pageshow',pageShow);
    }
  };
}

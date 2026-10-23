// One refresh at a time. Recovery/identity events cannot be swallowed by a poll.
const priority = { POLL: 0, DATABASE_CHANGE: 1, BOOT: 2, MANUAL: 3, SIGNED_IN: 4, SIGNED_OUT: 5, PASSWORD_RECOVERY: 6 };

export function createRefreshQueue(perform) {
  let active = null;
  let next = null;
  return function refresh(event = 'MANUAL') {
    if (next === null || (priority[event] ?? 3) >= (priority[next] ?? 3)) next = event;
    if (!active) {
      // Start on a microtask so reentrant calls see the same active promise.
      active = Promise.resolve().then(async () => {
        let failure;
        while (next !== null) {
          const current = next;
          next = null;
          try { await perform(current); failure = undefined; } catch (error) { failure = error; }
        }
        if (failure) throw failure;
      }).finally(() => { active = null; });
    }
    return active;
  };
}

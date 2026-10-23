/** Bind a sequence of commands to the identity that started it.
 * Server authorization still decides whether each operation is permitted.
 */
export function sessionCommands(api) {
  const revision = api.sessionRevision?.();
  const assertCurrent = () => {
    if (api.sessionRevision?.() !== revision) throw new Error('Sua sessão mudou durante a operação. Entre na conta usada para conferir o resultado.');
  };
  return new Proxy(api, {
    get(target, key) {
      if (key === 'assertCurrent') return assertCurrent;
      const value = target[key];
      if (typeof value !== 'function') return value;
      return (...args) => {
        assertCurrent();
        const result = value.apply(target,args);
        if (result?.then) return Promise.resolve(result).then(value => {assertCurrent();return value;});
        assertCurrent();return result;
      };
    }
  });
}

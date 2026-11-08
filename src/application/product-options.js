/** Parse every visible group separately. Prices remain server-authoritative. */
export function readProductGroups(form, cents) {
  const keys = form.getAll('optionGroupKey').map(String);
  if (!keys.length && form.has('extras')) keys.push('0');
  if (keys.length > 20 || new Set(keys).size !== keys.length || keys.some(key => !/^\d+$/.test(key))) {
    throw new Error('Use até 20 grupos de adicionais.');
  }
  const groups = [];
  for (const key of keys) {
    const suffix = key === '0' ? '' : '-' + key;
    const lines = String(form.get('extras' + suffix) || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) {
      if (Number(form.get('minChoices' + suffix) || 0) > 0) throw new Error('Um grupo obrigatório precisa ter opções.');
      continue;
    }
    const name = String(form.get('groupName' + suffix) || '').trim();
    const min = Number(form.get('minChoices' + suffix) || 0), max = Number(form.get('maxChoices' + suffix) || lines.length);
    if (!name || name.length > 80 || lines.length > 20 || !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < 1 || min > max || max > lines.length) {
      throw new Error('Confira o nome e os limites de escolhas de cada grupo.');
    }
    const options = lines.map(line => {
      const match = line.match(/^(.+):([^:]+)$/);
      if (!match || !match[1].trim() || match[1].trim().length > 80) throw new Error('Adicionais: use nome:preço em cada linha.');
      return {name: match[1].trim(), price_cents: cents(match[2].trim())};
    });
    groups.push({name, min_choices: min, max_choices: max, options});
  }
  return groups;
}

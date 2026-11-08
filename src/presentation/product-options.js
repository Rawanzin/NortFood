export function optionGroupFields(group, key, esc) {
  const suffix = String(key) === '0' ? '' : '-' + key;
  const options = group?.options || [];
  const extras = options.map(option => option.name + ':' + (option.price_cents / 100).toFixed(2).replace('.', ',')).join('\n');
  return '<fieldset class="onboarding-address" data-product-option-group><legend>Grupo de adicionais</legend>' +
    '<input type="hidden" name="optionGroupKey" value="' + esc(key) + '">' +
    '<label for="product-group-name-' + esc(key) + '">Nome do grupo</label><input id="product-group-name-' + esc(key) + '" name="groupName' + suffix + '" maxlength="80" value="' + esc(group?.name || 'Adicionais') + '">' +
    '<label for="product-group-extras-' + esc(key) + '">Opções (uma por linha: nome:preço)</label><textarea id="product-group-extras-' + esc(key) + '" name="extras' + suffix + '" placeholder="Queijo:3,50\nBacon:4,00">' + esc(extras) + '</textarea><small>Use preço 0 para opção sem custo.</small>' +
    '<div class="form-two-columns"><label>Mínimo de escolhas<input name="minChoices' + suffix + '" type="number" min="0" max="20" value="' + (group?.min_choices || 0) + '"></label>' +
    '<label>Máximo de escolhas<input name="maxChoices' + suffix + '" type="number" min="1" max="20" value="' + (group?.max_choices || options.length || 1) + '"></label></div>' +
    '<button type="button" class="text-btn" data-remove-option-group>Remover este grupo</button></fieldset>';
}

export function productOptionsFields(product, esc) {
  const groups = product?.[10]?.length ? product[10] : [{name:'Adicionais', min_choices:0, max_choices:product?.[7]?.length || 1,
    options:(product?.[7] || []).map(option => ({name:option.name, price_cents:Math.round(Number(option.price || 0) * 100)}))}];
  const ingredients = product?.[11]?.ingredients || [];
  return '<div class="field"><label for="product-ingredients">Ingredientes removíveis (um por linha)</label><textarea id="product-ingredients" name="ingredients" placeholder="Pão\nQueijo">' + esc(ingredients.join('\n')) + '</textarea><small>Remover um ingrediente não dá desconto.</small></div>' +
    '<div data-product-option-groups>' + groups.map((group,index) => optionGroupFields(group,index,esc)).join('') + '</div>' +
    '<button type="button" class="btn outline" data-add-option-group>Adicionar grupo de adicionais</button>';
}

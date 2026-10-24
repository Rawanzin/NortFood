// UI real em Chromium, com formulário sintético isolado. Não representa Supabase autenticado.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const field = (name, attributes = '') => `<div class="field"><label for="test-${name}">${name}</label><input id="test-${name}" name="${name}" ${attributes}></div>`;
const fixture = `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/signup-flow.css"><style>body{margin:0;font:16px system-ui;background:#fafafa;color:#202124}.shell{max-width:430px;margin:auto;padding:20px;box-sizing:border-box}.form,.field,.onboarding-address{display:grid;gap:6px}input,select{min-height:44px;width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:10px;padding:8px}input[type=checkbox]{min-height:20px;width:20px}.btn{border:0;border-radius:10px;padding:12px;background:#e4262f;color:white;font:inherit}.outline{color:#202124;background:white;border:1px solid #ddd}.field-error{color:#bc1820}.consent{font-size:14px}.signup-panel h3:focus{outline:0}</style><script src="/assets/signup-flow.js" defer></script></head><body><main class="shell"><form id="signup" class="form" novalidate>${field('name', 'required maxlength="80"')}${field('storeName', 'required maxlength="80"')}${field('phone', 'required type="tel"')}${field('identifier', 'required type="email"')}<div class="field"><label for="category">Categoria</label><select id="category" name="categoryId" required><option value="">Selecione</option><option value="real-category">Hamburgueria</option></select></div><fieldset class="onboarding-address"><legend>Endereço comercial</legend>${field('street', 'required')}${field('number', 'required')}${field('neighborhood', 'required')}${field('city', 'required')}${field('state', 'required maxlength="2"')}${field('postal_code')}${field('complement')}${field('reference')}</fieldset>${field('password', 'required type="password" minlength="12"')}<small>Use pelo menos 8 caracteres.</small>${field('confirmPassword', 'required type="password" minlength="12"')}<label class="consent"><input type="checkbox" name="consent" required> Li os termos e a Política de Privacidade.</label><p id="auth-error" role="alert"></p><button type="submit" class="btn auth-submit">Criar conta</button></form></main></body></html>`;

test('Cadastro em etapas mantém campos, erros e senhas na DOM; aceita mínimo8 e preenchimento manual', { timeout: 40000 }, async () => {
  const [code, css] = await Promise.all([fs.readFile(path.resolve('assets/signup-flow.js')), fs.readFile(path.resolve('assets/signup-flow.css'))]);
  const server = http.createServer((request, response) => {
    const isCode = request.url === '/assets/signup-flow.js', isCss = request.url === '/assets/signup-flow.css';
    response.writeHead(200, { 'Content-Type': (isCode ? 'text/javascript' : isCss ? 'text/css' : 'text/html') + '; charset=utf-8' });
    response.end(isCode ? code : isCss ? css : fixture);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      const form = document.getElementById('signup');
      window.passwordNode = form.elements.password;
      window.submissions = 0;
      form.addEventListener('submit', event => { event.preventDefault(); window.submissions++; document.getElementById('auth-error').textContent = 'Falha controlada de conexão. Seus dados foram mantidos.'; });
      window.flow = window.NortFoodSignup.mount(form, { kind: 'seller', onAddressSearch: ({ apply }) => {
        window.addressRequested = true;
        apply({ street: 'Rua Sintética Confirmada', number: '60', neighborhood: 'Bairro de Teste', city: 'Porteirinha', state: 'MG', postal_code: '39520-000' });
      } });
    });
    assert.equal(await page.locator('.signup-progress-label').innerText(), 'Etapa 1 de 3');
    assert.equal(await page.locator('[name=password]').getAttribute('minlength'), '8');
    await page.locator('[data-signup-next]').click();
    assert.equal(await page.locator('[name=name]').getAttribute('aria-invalid'), 'true');
    assert.match(await page.locator('.signup-feedback').innerText(), /Revise/);
    const contact = { name: 'Responsável Sintético', storeName: 'Loja Sintética Controlada', phone: '(38) 99999-9999', identifier: 'fixture@example.test' };
    for (const [name, value] of Object.entries(contact)) await page.locator(`[name=${name}]`).fill(value);
    await page.locator('[name=categoryId]').selectOption('real-category');
    await page.locator('[data-signup-next]').click();
    assert.equal(await page.locator('.signup-progress-label').innerText(), 'Etapa 2 de 3');
    await page.locator('[name=street]').fill('Endereço preenchido sem GPS');
    await page.locator('[data-signup-address-search]').click();
    assert.equal(await page.locator('[name=street]').inputValue(), 'Rua Sintética Confirmada');
    assert.equal(await page.locator('[name=postal_code]').inputValue(), '39520-000');
    await page.locator('[name=postal_code]').fill('123');
    await page.locator('[data-signup-next]').click();
    assert.match(await page.locator('[name=postal_code]').locator('..').innerText(), /8 números/);
    await page.locator('[name=postal_code]').fill('39520-000');
    await page.locator('[data-signup-next]').click();
    assert.equal(await page.locator('.signup-progress-label').innerText(), 'Etapa 3 de 3');
    await page.locator('[name=password]').fill('onzeletras!');
    await page.locator('[name=confirmPassword]').fill('divergente');
    await page.locator('[name=consent]').check();
    await page.locator('.auth-submit').click();
    assert.match(await page.locator('[name=confirmPassword]').locator('..').innerText(), /não conferem/);
    assert.equal(await page.evaluate(() => window.submissions), 0);
    await page.locator('[name=confirmPassword]').fill('onzeletras!');
    await page.locator('.auth-submit').click();
    assert.equal(await page.evaluate(() => window.submissions), 1);
    assert.match(await page.locator('#auth-error').innerText(), /mantidos/);
    await page.locator('[data-signup-back]').click();
    assert.equal(await page.locator('[name=street]').inputValue(), 'Rua Sintética Confirmada');
    await page.locator('[data-signup-back]').click();
    assert.equal(await page.locator('[name=name]').inputValue(), contact.name);
    await page.evaluate(() => window.flow.goTo(2));
    assert.equal(await page.locator('[name=password]').inputValue(), 'onzeletras!');
    for (const password of ['abcdefgh', '12345678', 'uma frase com espaços', '        ']) {
      await page.locator('[name=password]').fill(password);
      await page.locator('[name=confirmPassword]').fill(password);
      assert.equal(await page.evaluate(() => window.flow.validate({ all: true })), true, 'Senha mínima sem composição arbitrária');
    }
    await page.locator('[name=password]').fill('curta7!');
    await page.locator('[name=confirmPassword]').fill('curta7!');
    assert.equal(await page.evaluate(() => window.flow.validate({ all: true })), false);
    assert.match(await page.locator('[name=password]').locator('..').innerText(), /8 caracteres/);
    const saved = await page.evaluate(() => ({ draft: window.flow.snapshot(), local: localStorage.length, session: sessionStorage.length, same: window.passwordNode === document.querySelector('[name=password]') }));
    assert.equal(saved.draft.password, undefined); assert.equal(saved.draft.confirmPassword, undefined);
    assert.equal(saved.local, 0); assert.equal(saved.session, 0); assert.equal(saved.same, true);
    for (const width of [320, 360, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const step of [0, 1, 2]) {
        await page.evaluate(value => window.flow.goTo(value), step);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.flow.goTo(1));
    await fs.mkdir(path.resolve('test-results/ux-signup'), { recursive: true });
    await page.screenshot({ path: path.resolve('test-results/ux-signup/address-390-controlled.png') });
    await page.evaluate(() => window.flow.destroy());
    assert.equal(await page.locator('.signup-progress,.signup-panel').count(), 0);
    assert.equal(await page.locator('[name=password]').inputValue(), 'curta7!');
    assert.equal(await page.locator('[name=street]').isVisible(), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});

test('Rascunho de onboarding preserva CEP sem senhas e respeita o vínculo já confirmado', async () => {
  const { createOnboardingDraft } = await import('../src/platform/onboarding-draft.js');
  const entries = new Map(), storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  const draft = createOnboardingDraft(storage), payload = { kind: 'seller', name: 'Teste', address: { postal_code: '39520-000' }, password: 'NUNCA_SALVAR' };
  draft.save('fixture@example.test', payload); draft.bind('fixture@example.test', 'fixture-id');
  draft.save('fixture@example.test', { ...payload, address: { postal_code: '00000-000' } });
  assert.equal(draft.get('fixture@example.test', 'fixture-id').address.postal_code, '39520-000');
  assert.equal(JSON.stringify(Array.from(entries.values())).includes('NUNCA_SALVAR'), false);
});

test('UI usa a mesma chave com papel/e-mail estritos, sem senha ou aceite, e preserva recibos antigos', async () => {
  const { createOnboardingDraft } = await import('../src/platform/onboarding-draft.js');
  let now = 1000;
  const key = 'nortfood-onboarding-v1', entries = new Map([[key, JSON.stringify({ email: 'old@example.test', userId: 'original-id', expires: now + 86400000, data: { kind: 'customer', name: 'Antigo', consent: true, address: { street: 'Rua original' } } })]]);
  const storage = { getItem: name => entries.get(name), setItem: (name, value) => entries.set(name, value), removeItem: name => entries.delete(name) };
  const draft = createOnboardingDraft(storage, () => now);
  const customer = draft.saveForm('customer', 'A@example.test', { name: 'CLIENTE A', identifier: 'A@example.test', street: 'Entrega A', password: 'SENHA_NUNCA_GRAVAR', confirmPassword: 'SENHA_NUNCA_GRAVAR', consent: true }, 2);
  draft.saveForm('seller', 'a@example.test', { name: 'VENDEDOR A', identifier: 'a@example.test', street: 'Loja A', storeName: 'Loja A' }, 1);
  assert.deepEqual(Array.from(entries.keys()), [key]);
  const stored = JSON.parse(entries.get(key));
  assert.equal(stored.version, 2); assert.equal(stored.forms.length, 2);
  assert.equal(stored.forms.some(row => row.data.password || row.data.confirmPassword || 'consent' in row.data), false);
  assert.equal(entries.get(key).includes('SENHA_NUNCA_GRAVAR'), false);
  assert.equal(draft.get('old@example.test', 'original-id').bound, true);
  const beforeWrongUid = entries.get(key);
  assert.equal(draft.get('old@example.test', 'another-id'), null);
  assert.equal(draft.get('old@example.test'), null);
  assert.equal(entries.get(key), beforeWrongUid);
  assert.equal(draft.get('old@example.test', 'original-id').address.street, 'Rua original');
  assert.equal(draft.getForm('customer', 'a@example.test').data.street, 'Entrega A');
  assert.equal(draft.getForm('seller', 'a@example.test').data.street, 'Loja A');
  assert.equal(draft.getForm('customer', 'b@example.test'), null); assert.equal(draft.getForm('admin', 'a@example.test'), null);
  assert.equal(draft.resumeForm(customer.id, 'seller'), null);
  assert.equal(JSON.stringify(draft.listForms('customer')).includes('CLIENTE A'), false);
  assert.equal(JSON.stringify(draft.listForms('customer')).includes('Entrega A'), false);
  assert.equal(JSON.stringify(draft.listForms('customer')).includes('a@example.test'), false);
  const recovered = draft.resumeForm(customer.id, 'customer'); recovered.data.street = 'Mutação fora do helper';
  assert.equal(draft.getForm('customer', 'a@example.test').data.street, 'Entrega A');
  const anonymous = draft.saveForm('customer', '', { identifier: 'a@example.test' });
  assert.equal(draft.saveForm('customer', 'a@example.test', { identifier: 'a@example.test' }, 0, anonymous.id).conflict, true);
  assert.equal(draft.saveForm('customer', 'a@example.test', { name: 'Não substituir sem Retomar' }).conflict, true);
  assert.equal(draft.getForm('customer', 'a@example.test').data.name, 'CLIENTE A');
  assert.equal(draft.getForm('customer', 'a@example.test').data.street, 'Entrega A');
  draft.clearForms({ email: 'a@example.test' });
  assert.equal(draft.listForms('customer').length, 0); assert.equal(draft.get('old@example.test', 'original-id').bound, true);
  draft.save('second@example.test', { kind: 'seller', name: 'Segundo', consent: true }); draft.bind('second@example.test', 'second-id');
  draft.clearPending('old@example.test', 'wrong-id'); assert.equal(draft.get('old@example.test', 'original-id').bound, true);
  draft.clearPending('old@example.test', 'original-id'); assert.equal(draft.get('old@example.test', 'original-id'), null); assert.equal(draft.get('second@example.test', 'second-id').bound, true);
  now += 86400001; assert.equal(draft.get('second@example.test', 'second-id'), null);
});

test('Limites de UI e recibos não descartam contas vinculadas; armazenamento bloqueado mantém só memória', async () => {
  const { createOnboardingDraft } = await import('../src/platform/onboarding-draft.js');
  let now = 1000;
  const entries = new Map(), storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }, draft = createOnboardingDraft(storage, () => now);
  for (let i = 0; i < 8; i++) { assert.equal(draft.save('pending' + i + '@example.test', { name: 'Conta ' + i, kind: 'customer' }), true); draft.bind('pending' + i + '@example.test', 'identity-' + i); }
  assert.equal(draft.save('too-many@example.test', { name: 'Não apagar anteriores' }), false);
  for (let i = 0; i < 12; i++) { now++; draft.saveForm('customer', 'form' + i + '@example.test', { name: 'Á'.repeat(10000), identifier: 'form' + i + '@example.test', street: 'Á'.repeat(10000), reference: 'Á'.repeat(10000), unknown: 'NÃO GUARDAR' }, 9); }
  assert.equal(draft.listForms('customer').length, 6);
  assert.equal(draft.getForm('customer', 'form0@example.test'), null);
  assert.equal(draft.getForm('customer', 'form11@example.test').data.name.length, 80);
  assert.equal(draft.getForm('customer', 'form11@example.test').step, 2);
  assert.ok(Buffer.byteLength(entries.get('nortfood-onboarding-v1'), 'utf8') <= 65536);
  for (let i = 0; i < 8; i++) assert.equal(draft.get('pending' + i + '@example.test', 'identity-' + i).bound, true);
  draft.clearForms(); for (let i = 0; i < 8; i++) assert.equal(draft.get('pending' + i + '@example.test', 'identity-' + i).bound, true);
  draft.clear(); assert.equal(entries.size, 0);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } }, memory = createOnboardingDraft(blocked, () => now);
  const anonymous = memory.saveForm('seller', '', { name: 'Sem e-mail ainda', password: 'NUNCA_GUARDAR' }, 0);
  assert.equal(memory.getForm('seller', ''), null);
  assert.equal(memory.resumeForm(anonymous.id, 'seller').data.name, 'Sem e-mail ainda');
  const bound = memory.saveForm('seller', 'seller@example.test', { name: 'Mesmo rascunho' }, 1, anonymous.id);
  assert.equal(bound.id, anonymous.id); assert.equal(memory.listForms('seller').length, 1);
  assert.equal(createOnboardingDraft(blocked, () => now).listForms('seller').length, 0);
});

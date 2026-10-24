(function () {
  'use strict';

  const mounted = new WeakMap();
  const addressNames = new Set(['street', 'number', 'neighborhood', 'city', 'state', 'postalCode', 'postal_code', 'cep', 'complement', 'reference']);
  const accessNames = new Set(['password', 'confirmPassword', 'consent']);
  const safeNames = new Set(['name', 'identifier', 'email', 'phone', 'storeName', 'categoryId', ...addressNames]);
  const states = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
  let sequence = 0;

  function snapshot(form) {
    return Object.fromEntries(Array.from(form.elements).filter(field => safeNames.has(field.name)).map(field => [field.name, field.value]));
  }

  function restore(form, values = {}) {
    for (const [name, value] of Object.entries(values)) {
      const field = safeNames.has(name) && form.elements.namedItem(name);
      if (field && typeof field.value === 'string') field.value = String(value ?? '');
    }
  }

  function messageFor(field, form) {
    const name = field.name, value = ['password', 'confirmPassword'].includes(name) ? String(field.value || '') : String(field.value || '').trim();
    if (field.required && ((field.type === 'checkbox' && !field.checked) || (field.type !== 'checkbox' && !value))) {
      if (name === 'consent') return 'Aceite os termos e a Política de Privacidade para continuar.';
      if (name === 'confirmPassword') return 'Confirme sua senha.';
      if (name === 'categoryId') return 'Selecione a categoria do estabelecimento.';
      return 'Preencha este campo para continuar.';
    }
    if (!value || field.type === 'checkbox') return '';
    if (name === 'password' && field.value.length < 8) return 'Use pelo menos 8 caracteres na senha.';
    if (name === 'confirmPassword' && field.value !== form.elements.namedItem('password')?.value) return 'As senhas não conferem.';
    if ((field.type === 'email' || name === 'identifier' || name === 'email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Informe um e-mail válido, como voce@exemplo.com.';
    if (name === 'phone' && !/^(?:55)?[1-9][0-9](?:9[0-9]{8}|[2-5][0-9]{7})$/.test(value.replace(/\D/g, ''))) return 'Informe um telefone válido com DDD.';
    if (name === 'state' && !states.has(value.toUpperCase())) return 'Informe uma UF válida, como MG.';
    if (['postalCode', 'postal_code', 'cep'].includes(name) && !/^\d{8}$/.test(value.replace(/\D/g, ''))) return 'Informe um CEP com 8 números.';
    if (field.maxLength > 0 && field.value.length > field.maxLength) return 'Use até ' + field.maxLength + ' caracteres neste campo.';
    return '';
  }

  function mount(form, options = {}) {
    if (!form || form.tagName !== 'FORM') return null;
    if (mounted.has(form)) return mounted.get(form);
    const originalChildren = Array.from(form.childNodes), originalNoValidate = form.noValidate;
    const hasPassword = !!form.elements.namedItem('password');
    if (hasPassword) for (const name of ['password', 'confirmPassword']) {
      const input = form.elements.namedItem(name);
      if (input) { input.minLength = 8; input.removeAttribute('pattern'); }
    }
    const definitions = [
      { id: 'contact', title: 'Seus dados', description: options.kind === 'seller' ? 'Informe os dados do responsável e da loja.' : 'Como podemos identificar e contatar você?' },
      { id: 'address', title: options.kind === 'seller' ? 'Endereço comercial' : 'Endereço de entrega', description: 'Pesquise ou preencha manualmente. O GPS é opcional.' },
      ...(hasPassword ? [{ id: 'access', title: 'Proteja sua conta', description: 'Escolha sua senha e confira os termos.' }] : []),
    ];
    const ownerDocument = form.ownerDocument, make = (tag, className, text) => {
      const element = ownerDocument.createElement(tag);
      if (className) element.className = className;
      if (text) element.textContent = text;
      return element;
    };
    const progress = make('div', 'signup-progress');
    progress.setAttribute('aria-label', 'Etapas do cadastro');
    const progressText = make('p', 'signup-progress-label');
    progressText.setAttribute('aria-live', 'polite');
    const indicators = make('ol', 'signup-progress-track');
    definitions.forEach(definition => {
      const item = make('li', '', definition.title);
      item.dataset.signupIndicator = definition.id;
      indicators.append(item);
    });
    progress.append(progressText, indicators);
    const panels = definitions.map(definition => {
      const panel = make('section', 'signup-panel');
      panel.dataset.signupPanel = definition.id;
      const heading = make('h3', '', definition.title);
      heading.id = 'signup-heading-' + (++sequence);
      heading.tabIndex = -1;
      panel.setAttribute('aria-labelledby', heading.id);
      panel.append(heading, make('p', 'signup-panel-description', definition.description));
      return panel;
    });
    const submit = form.querySelector('button[type="submit"],button:not([type]),input[type="submit"]');
    const shared = [], originalSubmitHidden = submit?.hidden;
    let previousGroup = 0;
    for (const node of originalChildren) {
      if (node.nodeType !== 1) continue;
      if (node === submit || node.matches('[role="alert"],#auth-error,[role="status"]')) { shared.push(node); continue; }
      const controls = node.matches('input,select,textarea') ? [node] : Array.from(node.querySelectorAll('input,select,textarea'));
      const names = controls.map(field => field.name);
      let group = names.some(name => addressNames.has(name)) ? 1 : names.some(name => accessNames.has(name)) ? (hasPassword ? 2 : 1) : 0;
      if (!controls.length) {
        if (node.matches('small,.field-error')) group = previousGroup;
        else { shared.push(node); continue; }
      }
      panels[group].append(node);
      previousGroup = group;
    }
    const feedback = make('p', 'signup-feedback');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    const actions = make('div', 'signup-actions');
    const back = make('button', 'btn outline signup-back', 'Voltar');
    back.type = 'button'; back.dataset.signupBack = '';
    const next = make('button', 'btn signup-next', 'Continuar');
    next.type = 'button'; next.dataset.signupNext = '';
    actions.append(back, next);
    if (submit) actions.append(submit);
    form.prepend(progress, ...panels);
    form.append(...shared.filter(node => node !== submit), feedback, actions);
    form.noValidate = true;
    form.classList.add('signup-flow');
    const generatedErrors = [], originalDescriptions = new Map();
    const fields = () => Array.from(form.elements).filter(field => ['INPUT', 'SELECT', 'TEXTAREA'].includes(field.tagName) && field.type !== 'hidden' && !field.disabled);
    function errorNode(field) {
      let output = String(field.getAttribute('aria-describedby') || '').split(/\s+/).map(id => ownerDocument.getElementById(id)).find(node => node?.classList.contains('field-error'));
      if (output) return output;
      output = make('small', 'field-error');
      output.id = 'signup-error-' + (++sequence);
      output.setAttribute('aria-live', 'polite');
      originalDescriptions.set(field, field.getAttribute('aria-describedby'));
      field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), output.id].filter(Boolean).join(' '));
      (field.closest('.field') || field.parentElement).append(output);
      generatedErrors.push(output);
      return output;
    }
    function validateField(field) {
      const message = messageFor(field, form);
      field.setCustomValidity(message);
      field.setAttribute('aria-invalid', String(!!message));
      errorNode(field).textContent = message;
      return !message;
    }
    let current = 0;
    function goTo(index, { focus = false } = {}) {
      current = Math.max(0, Math.min(panels.length - 1, Number(index) || 0));
      panels.forEach((panel, i) => { panel.hidden = i !== current; });
      Array.from(indicators.children).forEach((item, i) => {
        item.classList.toggle('is-complete', i < current);
        if (i === current) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      });
      progressText.textContent = 'Etapa ' + (current + 1) + ' de ' + panels.length;
      back.hidden = current === 0;
      next.hidden = current === panels.length - 1;
      if (submit) submit.hidden = current !== panels.length - 1;
      form.dataset.signupStep = String(current + 1);
      feedback.textContent = '';
      if (focus) {
        const heading = panels[current].querySelector('h3');
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
      options.onStep?.(current, form);
    }
    function validate({ all = false, focus = true } = {}) {
      const selected = fields().filter(field => all || panels[current].contains(field));
      const invalid = selected.filter(field => !validateField(field));
      if (invalid.length && focus) {
        const panelIndex = panels.findIndex(panel => panel.contains(invalid[0]));
        if (panelIndex >= 0) goTo(panelIndex);
        feedback.textContent = 'Revise os campos destacados para continuar.';
        invalid[0].focus();
      }
      return !invalid.length;
    }
    function advance() { if (validate()) goTo(current + 1, { focus: true }); }
    function onSubmit(event) {
      if (current < panels.length - 1) { event.preventDefault(); event.stopImmediatePropagation(); advance(); }
      else if (!validate({ all: true })) { event.preventDefault(); event.stopImmediatePropagation(); }
    }
    function onInput(event) {
      const field = event.target;
      if (field.form !== form || !['INPUT', 'SELECT', 'TEXTAREA'].includes(field.tagName)) return;
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      if (field.name === 'password') {
        const confirmation = form.elements.namedItem('confirmPassword');
        if (confirmation?.getAttribute('aria-invalid') === 'true') validateField(confirmation);
      }
    }
    function onBack() { goTo(current - 1, { focus: true }); }
    back.addEventListener('click', onBack);
    next.addEventListener('click', advance);
    form.addEventListener('submit', onSubmit, true);
    form.addEventListener('input', onInput);
    form.addEventListener('change', onInput);
    if (typeof options.onAddressSearch === 'function') {
      const search = make('button', 'signup-address-search', 'Buscar endereço');
      search.type = 'button'; search.dataset.signupAddressSearch = '';
      search.addEventListener('click', async () => { search.disabled = true; try { await options.onAddressSearch({ form, kind: options.kind || 'customer', apply(address) {
        for (const [key, value] of Object.entries(address || {})) {
          const aliases = key === 'postalCode' || key === 'postal_code' || key === 'cep' ? ['postalCode', 'postal_code', 'cep'] : [key];
          for (const alias of aliases) {
            const field = addressNames.has(alias) && form.elements.namedItem(alias);
            if (field && typeof field.value === 'string') { field.value = String(value ?? ''); field.dispatchEvent(new Event('input', { bubbles: true })); }
          }
        }
      } }); } catch { feedback.textContent = 'Não foi possível abrir a busca agora. Você pode preencher o endereço manualmente.'; } finally { search.disabled = false; } });
      panels[1].insertBefore(search, panels[1].children[2] || null);
    }
    const api = {
      goTo, validate, snapshot: () => snapshot(form),
      revealField(name) { const field = form.elements.namedItem(name), index = panels.findIndex(panel => panel.contains(field)); if (index >= 0) goTo(index); field?.focus(); },
      get step() { return current; },
      destroy() {
        form.removeEventListener('submit', onSubmit, true); form.removeEventListener('input', onInput); form.removeEventListener('change', onInput);
        back.removeEventListener('click', onBack); next.removeEventListener('click', advance);
        generatedErrors.forEach(node => node.remove());
        for (const [field, description] of originalDescriptions) if (description === null) field.removeAttribute('aria-describedby'); else field.setAttribute('aria-describedby', description);
        form.replaceChildren(...originalChildren); form.noValidate = originalNoValidate; form.classList.remove('signup-flow'); delete form.dataset.signupStep;
        if (submit) submit.hidden = originalSubmitHidden;
        mounted.delete(form);
      },
    };
    mounted.set(form, api); goTo(options.initialStep || 0);
    return api;
  }

  window.NortFoodSignup = { mount, snapshot, restore, minimumPasswordLength: 8 };
}());

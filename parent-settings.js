const passwordKey = 'school-parent:password:v1';
const iterations = 600_000;

const encode = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const decode = hex => Uint8Array.from(hex.match(/../g), byte => Number.parseInt(byte, 16));

async function derivePassword(password, salt) {
  const secret = new TextEncoder().encode(password);
  try {
    const key = await crypto.subtle.importKey('raw', secret, 'PBKDF2', false, ['deriveBits']);
    const result = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256,
    );
    return encode(new Uint8Array(result));
  } finally {
    secret.fill(0);
  }
}

function passwordRecord() {
  const record = localStorage.getItem(passwordKey);
  if (record === null) return null;
  const value = JSON.parse(record);
  if (value?.version !== 1 || !/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{64}$/.test(value.hash)) {
    throw new Error('Invalid password record');
  }
  return value;
}

function equalHash(left, right) {
  let different = 0;
  for (let i = 0; i < right.length; i++) {
    different |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return different === 0;
}

function matchingKeys(storage, keys, prefixes) {
  const exact = new Set(keys);
  const matches = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && !key.startsWith('school-parent:') &&
      (exact.has(key) || prefixes.some(prefix => prefix && key.startsWith(prefix)))) {
      matches.push(key);
    }
  }
  return matches;
}

function dialogTemplate() {
  const dialog = document.createElement('dialog');
  dialog.id = 'parent-settings-dialog';
  dialog.className = 'parent-settings-dialog';
  dialog.setAttribute('aria-labelledby', 'parent-settings-title');
  dialog.innerHTML = `
    <h2 id="parent-settings-title">家长设置</h2>
    <p data-parent-description></p>
    <form data-parent-form>
      <label for="parent-password">家长密码</label>
      <input id="parent-password" type="password" maxlength="128" required>
      <div data-parent-repeat hidden>
        <label for="parent-password-repeat">再次输入家长密码</label>
        <input id="parent-password-repeat" type="password" maxlength="128" autocomplete="new-password">
      </div>
      <label class="parent-reset-confirmation" data-parent-confirmation hidden>
        <input type="checkbox" data-parent-confirm>
        我确认清除这些学习记录。
      </label>
      <p class="parent-settings-message" role="status" aria-live="polite"></p>
      <div class="parent-settings-actions">
        <button type="button" data-parent-cancel>取消</button>
        <button type="submit" data-parent-submit></button>
      </div>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

export function mountParentSettings({
  subject, label, entry, visible = () => true, localKeys = [], localPrefixes = [],
  sessionKeys = [], sessionPrefixes = [], onReload = () => location.reload(),
}) {
  const resetKey = 'school-parent:reset:' + subject;
  const noticeKey = 'school-parent:notice:' + subject;
  let knownReset = '';
  try { knownReset = localStorage.getItem(resetKey) || ''; } catch {}
  let pending = false;
  let reloading = false;

  function notify(phase) {
    window.dispatchEvent(new CustomEvent('parent-learning-reset', { detail: { subject, phase } }));
  }

  function startReset() {
    if (!pending) {
      pending = true;
      notify('start');
    }
  }

  function cancelReset() {
    if (pending) {
      pending = false;
      notify('failed');
    }
  }

  function finishReset(announce) {
    if (reloading) return;
    reloading = true;
    for (const key of matchingKeys(sessionStorage, sessionKeys, sessionPrefixes)) {
      sessionStorage.removeItem(key);
    }
    if (announce) {
      try { sessionStorage.setItem(noticeKey, '1'); } catch {}
    }
    onReload();
  }

  function receiveReset(value) {
    if (!value || value === knownReset) return;
    knownReset = value;
    if (value.startsWith('pending:')) startReset();
    else if (value.startsWith('failed:')) cancelReset();
    else if (value.startsWith('done:')) {
      startReset();
      finishReset(false);
    }
  }

  window.addEventListener('storage', event => {
    if (event.key === resetKey) receiveReset(event.newValue);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      try { receiveReset(localStorage.getItem(resetKey)); } catch {}
    }
  });
  if (!entry) return;

  entry.classList.add('parent-settings-entry');
  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.dataset.parentOpen = '';
  openButton.textContent = '家长设置';
  entry.append(openButton);
  let dialog;
  let form;
  let busy = false;
  const control = selector => dialog.querySelector(selector);

  function syncVisibility() {
    entry.hidden = !visible();
    if (entry.hidden && !busy) dialog?.close();
  }
  window.addEventListener('hashchange', syncVisibility);
  syncVisibility();

  try {
    if (sessionStorage.getItem(noticeKey) === '1') {
      sessionStorage.removeItem(noticeKey);
      const notice = document.createElement('p');
      notice.className = 'parent-settings-notice';
      notice.setAttribute('role', 'status');
      notice.textContent = label + '学习记录已清除。';
      entry.append(notice);
    }
  } catch {}

  function showMode(setup) {
    form.reset();
    form.dataset.mode = setup ? 'setup' : 'clear';
    control('[data-parent-repeat]').hidden = !setup;
    control('#parent-password-repeat').required = setup;
    control('[data-parent-confirmation]').hidden = setup;
    control('[data-parent-confirm]').required = !setup;
    control('#parent-password').autocomplete = setup ? 'new-password' : 'current-password';
    control('[data-parent-description]').textContent = setup
      ? '请家长先设置一个密码。这个浏览器的四个学科共用该密码。'
      : '清除本浏览器的' + label + '学习进度、作答和草稿。清除后无法在本网站恢复。';
    control('[data-parent-submit]').textContent = setup ? '设置密码' : '确认清除';
    control('[data-parent-submit]').classList.toggle('parent-clear-button', !setup);
    control('.parent-settings-message').textContent = '';
  }

  function setBusy(value) {
    busy = value;
    form.setAttribute('aria-busy', String(value));
    for (const field of form.elements) field.disabled = value;
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;

    const message = control('.parent-settings-message');
    const primary = control('#parent-password');
    const password = primary.value;
    const setup = form.dataset.mode === 'setup';
    if (!password.trim()) {
      message.textContent = '请输入家长密码。';
      primary.focus();
      return;
    }
    if (setup && password !== control('#parent-password-repeat').value) {
      message.textContent = '两次输入的密码不同，请再核对。';
      control('#parent-password-repeat').focus();
      return;
    }
    message.textContent = '正在核对…';
    setBusy(true);
    let marker = '';

    try {
      const saved = passwordRecord();
      if (setup) {
        if (saved) {
          showMode(false);
          message.textContent = '已有家长密码，请输入已设置的密码。';
          return;
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const hash = await derivePassword(password, salt);
        if (passwordRecord()) {
          showMode(false);
          message.textContent = '已有家长密码，请输入已设置的密码。';
          return;
        }
        localStorage.setItem(passwordKey, JSON.stringify({ version: 1, salt: encode(salt), hash }));
        showMode(false);
        message.textContent = '密码已设置。需要清除记录时，请重新输入密码并确认。';
        return;
      }

      if (!saved) {
        showMode(true);
        message.textContent = '请家长先设置密码。';
        return;
      }
      const hash = await derivePassword(password, decode(saved.salt));
      const current = passwordRecord();
      if (!equalHash(hash, saved.hash) || current?.hash !== saved.hash || current.salt !== saved.salt) {
        message.textContent = '家长密码不正确。';
        primary.value = '';
        return;
      }

      if (localStorage.getItem(resetKey)?.startsWith('pending:')) {
        message.textContent = '另一个标签正在清除学习记录，请稍后重试。';
        return;
      }
      matchingKeys(sessionStorage, sessionKeys, sessionPrefixes);
      marker = encode(crypto.getRandomValues(new Uint8Array(12)));
      localStorage.setItem(resetKey, 'pending:' + marker);
      startReset();
      for (const key of matchingKeys(localStorage, localKeys, localPrefixes)) localStorage.removeItem(key);
      knownReset = 'done:' + marker;
      localStorage.setItem(resetKey, knownReset);
      finishReset(true);
    } catch {
      if (marker) {
        knownReset = 'failed:' + marker;
        try { localStorage.setItem(resetKey, knownReset); } catch {}
        cancelReset();
      }
      message.textContent = '操作未完成。请确认浏览器允许保存网站数据，再重试。';
    } finally {
      if (!reloading) {
        setBusy(false);
        primary.focus();
      }
    }
  }

  openButton.addEventListener('click', () => {
    if (!dialog) {
      dialog = dialogTemplate();
      form = control('[data-parent-form]');
      control('[data-parent-cancel]').addEventListener('click', () => dialog.close());
      dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
      dialog.addEventListener('close', () => {
        form.reset();
        control('.parent-settings-message').textContent = '';
      });
      form.addEventListener('submit', submit);
    }
    control('[data-parent-submit]').disabled = false;
    try {
      showMode(!passwordRecord());
      if (!crypto.subtle) throw new Error('Web Crypto unavailable');
    } catch {
      showMode(true);
      control('[data-parent-submit]').disabled = true;
      control('.parent-settings-message').textContent = '家长设置暂时无法使用。请从正式网站打开，并允许保存网站数据。';
    }
    dialog.showModal();
    control('#parent-password').focus();
  });
}

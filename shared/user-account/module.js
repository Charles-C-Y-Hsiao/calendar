/* Standalone user-account module runtime; no calendar API or mode state. */
const USER_ACCOUNT_STORAGE_KEY = 'calendar.currentUserId';
const isValidUserAccountId = value => /^\d{8}$/.test(String(value || '').trim());
const readUserAccountId = () => { try { return localStorage.getItem(USER_ACCOUNT_STORAGE_KEY) || ''; } catch (_) { return ''; } };
const writeUserAccountId = value => { const next = String(value || '').trim(); if (!isValidUserAccountId(next)) return false; try { localStorage.setItem(USER_ACCOUNT_STORAGE_KEY, next); return true; } catch (_) { return false; } };

(function initUserAccountModule() {
  const root = document.querySelector('.user-account-module');
  if (!root) return;
  const trigger = root.querySelector('.account-user-trigger');
  const dialog = root.querySelector('#userDialog');
  const warning = root.querySelector('#userAccountWarning');
  const input = root.querySelector('#textInput');
  const counter = root.querySelector('.counter');
  const close = root.querySelector('#dialogClose');
  const warningClose = root.querySelector('#warningClose');
  const clear = root.querySelector('.clear');
  const login = root.querySelector('.login');
  if (![trigger, dialog, warning, input, counter, close, warningClose, clear, login].every(Boolean)) return;
  const position = (element, above = false) => { const r = trigger.getBoundingClientRect(); const h = element.getBoundingClientRect().height || 150; element.style.left = `${Math.max(12, Math.min(r.left, innerWidth - element.offsetWidth - 12))}px`; element.style.top = `${above ? Math.max(12, r.top - h - 8) : Math.min(innerHeight - h - 12, r.bottom + 8)}px`; };
  const update = () => { const value = input.value; const n = value.length; const invalid = !/^\d*$/.test(value) || n > 8; counter.textContent = `Entered ${n} / 8 characters`; counter.className = `counter ${invalid ? 'counter-red' : n === 0 ? 'counter-yellow' : n < 8 ? 'counter-green' : 'counter-blue-strong'}`; input.classList.toggle('is-account-complete', n === 8 && !invalid); };
  const closeAll = () => { if (dialog.open) dialog.close(); if (warning.open) warning.close(); };
  const showWarning = message => {
    warning.querySelector('p').textContent = message;
    warning.show();
    const wr = warning.getBoundingClientRect();
    const dr = dialog.getBoundingClientRect();
      const top = dr.top + (dr.height - wr.height) / 2;
      warning.style.left = `${dr.left + (dr.width - wr.width) / 2}px`;
      warning.style.top = `${Math.max(12, top)}px`;
  };
  trigger.addEventListener('click', () => { input.value = readUserAccountId(); update(); dialog.show(); position(dialog); input.focus(); });
  close.addEventListener('click', closeAll); warningClose.addEventListener('click', () => warning.close());
  clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
  input.addEventListener('input', () => { const raw = input.value; if (/[^0-9]/.test(raw) || raw.length > 8) showWarning('Please enter exactly 8 digits (0–9).'); input.value = raw.replace(/\D/g, '').slice(0, 8); update(); });
  login.addEventListener('click', () => { const value = input.value.trim(); if (!isValidUserAccountId(value)) { showWarning('Please enter exactly 8 digits (0–9).'); return; } writeUserAccountId(value); if (typeof window.onUserAccountLogin === 'function') window.onUserAccountLogin(value); });
  update();
})();

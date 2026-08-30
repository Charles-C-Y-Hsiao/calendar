/* Weekly-owned account runtime. Weekly is intentionally independent from
 * shared user-account module. */
const WEEKLY_USER_STORAGE_KEY = 'calendar.currentUserId';

function isValidWeeklyUserId(value) {
  return /^[0-9]{8}$/.test(String(value || '').trim());
}

function readWeeklyUserId() {
  try { return localStorage.getItem(WEEKLY_USER_STORAGE_KEY); }
  catch (error) { console.warn('[weekly-account] localStorage read failed', error); return null; }
}

function setWeeklyUserId(value) {
  const next = String(value || '').trim();
  if (!isValidWeeklyUserId(next)) return false;
  try { localStorage.setItem(WEEKLY_USER_STORAGE_KEY, next); return true; }
  catch (error) { console.warn('[weekly-account] localStorage write failed', error); return false; }
}

/* Keep the existing Weekly persistence/adapter contract local to Weekly. */
function isValidCalendarUserId(value) { return isValidWeeklyUserId(value); }
function readStoredCalendarUserId() { return readWeeklyUserId(); }
function setStoredCalendarUserId(value) { return setWeeklyUserId(value); }
function bindCalendarUserStorageSync(onChange) {
  window.addEventListener('storage', event => {
    if (event.key === WEEKLY_USER_STORAGE_KEY && isValidWeeklyUserId(event.newValue) && typeof onChange === 'function') {
      onChange(event.newValue);
    }
  });
}

function initCalendarUserId(defaultUserId) {
  const queryUserId = new URLSearchParams(location.search).get('userId');
  if (isValidWeeklyUserId(queryUserId)) {
    setWeeklyUserId(queryUserId);
    return queryUserId;
  }
  const stored = readWeeklyUserId();
  if (isValidWeeklyUserId(stored)) return stored;
  const fallback = isValidWeeklyUserId(defaultUserId) ? String(defaultUserId) : '00666888';
  setWeeklyUserId(fallback);
  return fallback;
}

window.showAccountInputWarning = function (message = 'Please enter digits 0–9 only.') {
  document.querySelectorAll('.account-input-warning-dialog').forEach(el => el.remove());
  const dialog = document.createElement('dialog');
  dialog.className = 'account-input-warning-dialog';
  dialog.setAttribute('aria-label', 'Invalid input');
  dialog.innerHTML = `<div class="account-input-warning"><h2>Invalid input</h2><p>${message}</p><div class="account-input-warning-actions"><button type="button" class="account-input-warning-close">Close</button></div></div>`;
  document.body.appendChild(dialog);
  const close = () => { if (dialog.open) dialog.close(); dialog.remove(); };
  dialog.querySelector('.account-input-warning-close').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
};

(function initWeeklyAccount() {
  function init() {
    const trigger = document.getElementById('show-user-name');
    const overlay = document.getElementById('user-dialog-overlay');
    const dialog = document.querySelector('.user-dialog');
    const input = document.getElementById('textInput');
    const counter = document.getElementById('counter');
    const closeButton = document.getElementById('dialog-close-btn');
    const clearButton = document.getElementById('clearUser');
    const loginButton = document.querySelector('.btn-primary');
    if (!trigger || !overlay || !dialog || !input || !counter || !closeButton || !clearButton || !loginButton) return;

    const close = () => { dialog.style.display = 'none'; overlay.style.display = 'none'; };
    const updateCounter = () => {
      const value = input.value;
      const length = value.length;
      const invalid = !/^\d*$/.test(value) || length > 8;
      counter.textContent = `Entered ${length} / 8 characters`;
      counter.classList.remove('counter-yellow', 'counter-green', 'counter-red', 'counter-blue-strong', 'weight');
      input.classList.toggle('is-account-complete', length === 8 && !invalid);
      if (invalid) counter.classList.add('counter-red', 'weight');
      else if (length === 0) counter.classList.add('counter-yellow');
      else if (length < 8) counter.classList.add('counter-green');
      else counter.classList.add('counter-blue-strong', 'weight');
    };
    const open = () => {
      input.value = (typeof window.user_name === 'string' && isValidWeeklyUserId(window.user_name)) ? window.user_name : (readWeeklyUserId() || '');
      updateCounter();
      overlay.style.display = 'flex';
      dialog.style.display = 'flex';
      input.focus();
    };
    window.closeWeeklyAccountDialog = close;
    trigger.addEventListener('click', event => { event.preventDefault(); open(); });
    closeButton.addEventListener('click', event => { event.preventDefault(); close(); });
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    input.addEventListener('input', () => {
      const raw = input.value;
      if (/[^0-9]/.test(raw) || raw.length > 8) window.showAccountInputWarning();
      input.value = raw.replace(/\D/g, '').slice(0, 8);
      updateCounter();
    });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') loginButton.click(); if (event.key === 'Escape') close(); });
    clearButton.addEventListener('click', () => { input.value = ''; updateCounter(); input.focus(); });
    loginButton.addEventListener('click', () => {
      const value = input.value.trim();
      if (!isValidWeeklyUserId(value)) { window.showAccountInputWarning('Please enter exactly 8 digits (0–9).'); input.focus(); return; }
      if (window.accountLoginAdapter && typeof window.accountLoginAdapter.onLoginSuccess === 'function') {
        Promise.resolve(window.accountLoginAdapter.onLoginSuccess(value)).catch(error => console.error('[weekly-account] login failed', error));
      }
    });
    updateCounter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

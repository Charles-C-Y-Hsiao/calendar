/* Daily-owned account runtime.
 * Daily is intentionally independent from shared/user-account/.
 */
const CALENDAR_USER_STORAGE_KEY = 'calendar.currentUserId';

function isValidCalendarUserId(value) {
  return /^[0-9]{8}$/.test(String(value || '').trim());
}

function readStoredCalendarUserId() {
  try { return localStorage.getItem(CALENDAR_USER_STORAGE_KEY); }
  catch (error) { console.warn('[daily-account] localStorage read failed', error); return null; }
}

function setStoredCalendarUserId(value) {
  const nextUserId = String(value || '').trim();
  if (!isValidCalendarUserId(nextUserId)) return false;
  try { localStorage.setItem(CALENDAR_USER_STORAGE_KEY, nextUserId); return true; }
  catch (error) { console.warn('[daily-account] localStorage write failed', error); return false; }
}

function initCalendarUserId(defaultUserId) {
  const queryUserId = new URLSearchParams(location.search).get('userId');
  if (isValidCalendarUserId(queryUserId)) {
    setStoredCalendarUserId(queryUserId);
    return queryUserId;
  }
  const fallbackUserId = isValidCalendarUserId(defaultUserId) ? String(defaultUserId) : '00666888';
  const storedUserId = readStoredCalendarUserId();
  if (isValidCalendarUserId(storedUserId)) return storedUserId;
  setStoredCalendarUserId(fallbackUserId);
  return fallbackUserId;
}

function bindCalendarUserStorageSync(onChange) {
  window.addEventListener('storage', event => {
    if (event.key === CALENDAR_USER_STORAGE_KEY && isValidCalendarUserId(event.newValue) && typeof onChange === 'function') {
      onChange(event.newValue);
    }
  });
}

/* Explicit window exports keep the Daily legacy controller contract stable. */
window.CALENDAR_USER_STORAGE_KEY = CALENDAR_USER_STORAGE_KEY;
window.isValidCalendarUserId = isValidCalendarUserId;
window.readStoredCalendarUserId = readStoredCalendarUserId;
window.setStoredCalendarUserId = setStoredCalendarUserId;
window.bindCalendarUserStorageSync = bindCalendarUserStorageSync;
window.initCalendarUserId = initCalendarUserId;

(function () {
  window.showAccountInputWarning = function (message = 'Please enter digits 0–9 only.') {
    document.querySelectorAll('.account-input-warning-overlay,.account-input-warning-dialog').forEach(el => el.remove());
    const dialog = document.createElement('dialog');
    dialog.className = 'account-input-warning-dialog';
    dialog.setAttribute('aria-label', 'Invalid input');
    dialog.innerHTML = `<div class="account-input-warning"><h2>Invalid input</h2><p>${message}</p><div class="account-input-warning-actions"><button type="button" class="account-input-warning-close secondary">Close</button></div></div>`;
    document.body.appendChild(dialog);
    const close = () => { if (dialog.open && typeof dialog.close === 'function') dialog.close(); dialog.remove(); };
    dialog.querySelector('.account-input-warning-close').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  };
})();

(function () {
  function init() {
    const trigger = document.getElementById('show-user-name');
    const dialog = document.getElementById('userDialog');
    const overlay = document.getElementById('user-dialog-overlay');
    const input = document.getElementById('textInput');
    const closeButton = document.getElementById('dialog-close-btn');
    const clearButton = document.getElementById('clearUser');
    const loginButton = document.getElementById('loginUser');
    const counter = document.getElementById('counter');
    if (!trigger || !dialog || !overlay || !input || !closeButton || !clearButton || !loginButton) return;

    const close = () => {
      overlay.classList.remove('is-open');
      if (dialog.open && typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    };
    window.closeAccountUserDialog = close;
    const updateCounter = () => {
      const value = input.value;
      const length = value.length;
      const invalidFormat = !/^\d*$/.test(value) || length > 8;
      counter.textContent = `Entered ${length} / 8 characters`;
      counter.classList.remove('counter-yellow', 'counter-green', 'counter-red', 'counter-blue-strong', 'weight');
      input.classList.toggle('is-account-complete', length === 8 && !invalidFormat);
      if (invalidFormat) counter.classList.add('counter-red', 'weight');
      else if (length === 0) counter.classList.add('counter-yellow');
      else if (length < 8) counter.classList.add('counter-green');
      else counter.classList.add('counter-blue-strong', 'weight');
    };
    const open = () => {
      input.value = window.dailyUserId || '';
      updateCounter();
      overlay.classList.add('is-open');
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      input.focus();
    };

    trigger.addEventListener('click', open);
    closeButton.addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    input.addEventListener('input', () => {
      const rawValue = input.value;
      if (/[^0-9]/.test(rawValue) || rawValue.length > 8) window.showAccountInputWarning();
      const sanitized = rawValue.replace(/\D/g, '').slice(0, 8);
      if (input.value !== sanitized) input.value = sanitized;
      updateCounter();
    });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') loginButton.click(); if (event.key === 'Escape') close(); });
    clearButton.addEventListener('click', () => { input.value = ''; input.focus(); updateCounter(); });
    loginButton.addEventListener('click', () => {
      const value = input.value.trim();
      if (!isValidCalendarUserId(value)) { window.showAccountInputWarning('Please enter exactly 8 digits (0–9).'); input.focus(); return; }
      if (window.accountLoginAdapter && typeof window.accountLoginAdapter.onLoginSuccess === 'function') {
        Promise.resolve(window.accountLoginAdapter.onLoginSuccess(value)).catch(error => console.error('[daily-account] login failed', error));
      }
    });
    updateCounter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

window.dailyAccountAdapter = {
  isValidUserId: isValidCalendarUserId,
  readStoredUserId: readStoredCalendarUserId,
  setStoredUserId: setStoredCalendarUserId,
};

window.accountLoginAdapter = {
  getCurrentUserId() { return window.dailyUserId || ''; },
  onLoginSuccess(nextUserId) {
    const input = document.getElementById('textInput');
    if (input) input.value = nextUserId;
    if (typeof window.applyUserIdFromDialog === 'function') window.applyUserIdFromDialog(nextUserId);
  },
};

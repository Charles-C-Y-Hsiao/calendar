/* Monthly-owned account runtime. */
const MONTHLY_USER_STORAGE_KEY = 'calendar.currentUserId';
function isValidMonthlyUserId(value) { return /^[0-9]{8}$/.test(String(value || '').trim()); }
function readMonthlyUserId() { try { return localStorage.getItem(MONTHLY_USER_STORAGE_KEY); } catch (_) { return null; } }
function setMonthlyUserId(value) { const next = String(value || '').trim(); if (!isValidMonthlyUserId(next)) return false; try { localStorage.setItem(MONTHLY_USER_STORAGE_KEY, next); return true; } catch (_) { return false; } }
function isValidCalendarUserId(value) { return isValidMonthlyUserId(value); }
function readStoredCalendarUserId() { return readMonthlyUserId(); }
function setStoredCalendarUserId(value) { return setMonthlyUserId(value); }
function bindCalendarUserStorageSync(onChange) { window.addEventListener('storage', event => { if (event.key === MONTHLY_USER_STORAGE_KEY && isValidMonthlyUserId(event.newValue) && typeof onChange === 'function') onChange(event.newValue); }); }
function initCalendarUserId(defaultUserId) { const query = new URLSearchParams(location.search).get('userId'); if (isValidMonthlyUserId(query)) { setMonthlyUserId(query); return query; } const stored = readMonthlyUserId(); if (isValidMonthlyUserId(stored)) return stored; const fallback = isValidMonthlyUserId(defaultUserId) ? String(defaultUserId) : '00666888'; setMonthlyUserId(fallback); return fallback; }

window.showAccountInputWarning = function (message = 'Please enter digits 0–9 only.') { document.querySelectorAll('.account-input-warning-dialog').forEach(el => el.remove()); const dialog = document.createElement('dialog'); dialog.className = 'account-input-warning-dialog'; dialog.setAttribute('aria-label', 'Invalid input'); dialog.innerHTML = `<div class="account-input-warning"><h2>Invalid input</h2><p>${message}</p><div class="account-input-warning-actions"><button type="button" class="account-input-warning-close">Close</button></div></div>`; document.body.appendChild(dialog); const close = () => { if (dialog.open) dialog.close(); dialog.remove(); }; dialog.querySelector('.account-input-warning-close').addEventListener('click', close); if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); };

(function initMonthlyAccount() {
  let attempts = 0;
  function init() {
    const trigger = document.getElementById('show-user-name'); const overlay = document.getElementById('user-dialog-overlay'); const dialog = document.querySelector('.user-dialog'); const input = document.getElementById('textInput'); const counter = document.getElementById('counter'); const closeButton = document.getElementById('dialog-close-btn'); const clearButton = document.getElementById('clearUser'); const loginButton = document.querySelector('.btn-primary');
    if (!trigger || !overlay || !dialog || !input || !counter || !closeButton || !clearButton || !loginButton) {
      if (attempts++ < 50) window.setTimeout(init, 0);
      return;
    }
    const close = () => { dialog.style.display = 'none'; overlay.style.display = 'none'; };
    const updateCounter = () => { const value = input.value; const length = value.length; const invalid = !/^\d*$/.test(value) || length > 8; counter.textContent = `Entered ${length} / 8 characters`; counter.classList.remove('counter-yellow','counter-green','counter-red','counter-blue-strong','weight'); input.classList.toggle('is-account-complete', length === 8 && !invalid); if (invalid) counter.classList.add('counter-red','weight'); else if (length === 0) counter.classList.add('counter-yellow'); else if (length < 8) counter.classList.add('counter-green'); else counter.classList.add('counter-blue-strong','weight'); };
    const open = () => { input.value = readMonthlyUserId() || ''; updateCounter(); overlay.style.display = 'flex'; dialog.style.display = 'flex'; input.focus(); };
    trigger.addEventListener('click', event => { event.preventDefault(); open(); }); closeButton.addEventListener('click', event => { event.preventDefault(); close(); }); overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    input.addEventListener('input', () => { const raw = input.value; if (/[^0-9]/.test(raw) || raw.length > 8) window.showAccountInputWarning(); input.value = raw.replace(/\D/g,'').slice(0,8); updateCounter(); }); input.addEventListener('keydown', event => { if (event.key === 'Enter') loginButton.click(); if (event.key === 'Escape') close(); }); clearButton.addEventListener('click', () => { input.value = ''; updateCounter(); input.focus(); });
    loginButton.addEventListener('click', () => { const value = input.value.trim(); if (!isValidMonthlyUserId(value)) { window.showAccountInputWarning('Please enter exactly 8 digits (0–9).'); input.focus(); return; } if (window.accountLoginAdapter && typeof window.accountLoginAdapter.onLoginSuccess === 'function') Promise.resolve(window.accountLoginAdapter.onLoginSuccess(value)).catch(error => console.error('[monthly-account] login failed', error)); }); updateCounter();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

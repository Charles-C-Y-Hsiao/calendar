/* module_id: action-dialogs
 * Small shared action-dialog core. Mode-specific dialogs keep their own state and callbacks.
 */
(function () {
  const MODULE_ID = 'action-dialogs';

  function removeExisting() {
    document.querySelectorAll('.action-dialog-overlay, .daily-confirm-overlay').forEach(node => node.remove());
  }

  function alertDialog(message, { title = 'Notice', okText = 'OK', timeoutMs = 0 } = {}) {
    return new Promise(resolve => {
      removeExisting();
      const overlay = document.createElement('div');
      overlay.className = 'action-dialog-overlay';
      overlay.innerHTML = `<div class="action-dialog action-alert-dialog" role="alertdialog" aria-modal="true">
        <div class="action-alert-title"></div><p class="action-alert-message"></p>
        <div class="action-alert-actions"><button type="button" class="action-alert-ok"></button></div>
      </div>`;
      overlay.querySelector('.action-alert-title').textContent = title;
      overlay.querySelector('.action-alert-message').textContent = message;
      overlay.querySelector('.action-alert-ok').textContent = okText;
      const close = () => { overlay.remove(); resolve(true); };
      overlay.querySelector('.action-alert-ok').addEventListener('click', close);
      overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
      overlay.addEventListener('keydown', event => { if (event.key === 'Escape' || event.key === 'Enter') close(); });
      document.body.appendChild(overlay);
      overlay.querySelector('.action-alert-ok').focus();
      if (timeoutMs > 0) setTimeout(() => { if (document.body.contains(overlay)) close(); }, timeoutMs);
    });
  }

  function normalizeAutoConfirm(autoConfirm) {
    if (!autoConfirm?.enabled) return null;
    const rawSeconds = Number(autoConfirm.seconds);
    if (Number.isInteger(rawSeconds) && rawSeconds >= 1 && rawSeconds <= 5) {
      return { seconds: rawSeconds };
    }
    console.warn('[action-dialogs] Invalid auto-confirm seconds. Falling back to 2 seconds.');
    return { seconds: 2 };
  }

  function confirmDialog({ title, message, okText = 'OK', cancelText = 'Cancel', danger = false, autoConfirm = null } = {}) {
    return new Promise(resolve => {
      removeExisting();
      const overlay = document.createElement('div');
      overlay.className = 'action-dialog-overlay';
      overlay.innerHTML = `<div class="action-dialog action-confirm-dialog" role="dialog" aria-modal="true">
        <div class="action-alert-title"></div><p class="action-alert-message"></p>
        <div class="action-alert-actions"><button type="button" class="action-confirm-cancel"></button><button type="button" class="action-confirm-ok"></button></div>
      </div>`;
      overlay.querySelector('.action-alert-title').textContent = title || '';
      overlay.querySelector('.action-alert-message').textContent = message || '';
      const ok = overlay.querySelector('.action-confirm-ok');
      const countdown = normalizeAutoConfirm(autoConfirm);
      let timerId = null;
      let closed = false;
      ok.textContent = okText;
      ok.classList.toggle('is-danger', danger);
      overlay.querySelector('.action-confirm-cancel').textContent = cancelText;
      const close = value => {
        if (closed) return;
        closed = true;
        if (timerId) window.clearInterval(timerId);
        overlay.remove();
        resolve(value);
      };
      ok.addEventListener('click', () => close(true));
      overlay.querySelector('.action-confirm-cancel').addEventListener('click', () => close(false));
      overlay.addEventListener('click', event => { if (event.target === overlay) close(false); });
      overlay.addEventListener('keydown', event => { if (event.key === 'Escape') close(false); });
      document.body.appendChild(overlay);
      ok.focus();
      if (countdown) {
        let remaining = countdown.seconds;
        const renderCountdown = () => { ok.textContent = `${okText} (${remaining}s)`; };
        renderCountdown();
        timerId = window.setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            close(true);
            return;
          }
          renderCountdown();
        }, 1000);
      }
    });
  }

  function initializePreview() {
    const preview = document.querySelector('[data-module="action-dialogs"][data-action-dialog-demo]');
    if (!preview) return;
    const result = preview.querySelector('[data-action-dialog-result]');

    preview.querySelector('[data-demo-alert]')?.addEventListener('click', async () => {
      await alertDialog('This is the shared alert presentation.', { title: 'Notice', okText: 'Close' });
      if (result) result.textContent = 'Alert closed';
    });

    preview.querySelector('[data-demo-confirm]')?.addEventListener('click', async () => {
      const accepted = await confirmDialog({
        title: 'Continue?',
        message: 'This is the shared confirm presentation.',
        okText: 'Continue',
        cancelText: 'Cancel',
      });
      if (result) result.textContent = accepted ? 'Confirmed' : 'Cancelled';
    });
  }

  window.actionDialogs = {
    moduleId: MODULE_ID,
    alert: alertDialog,
    confirm: confirmDialog,
    removeExisting,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePreview, { once: true });
  } else {
    initializePreview();
  }
})();

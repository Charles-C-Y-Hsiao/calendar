    function openDateTimeDialog({ oldDateStr, startHHmm, endHHmm, onConfirm }) {
    const overlay = document.createElement('div');
    overlay.className = 'dt-dialog-overlay';
    overlay.innerHTML = `
        <div class="dt-dialog">
        <div class="dt-dialog-title">請輸入日期與時間</div>
        <div class="dt-dialog-subtitle">格式：YYYY-MM-DD HH:MM~HH:MM</div>
        <div class="dt-dialog-row">
            <label>日期</label>
            <input type="date" class="dt-date">
        </div>
        <div class="dt-dialog-row">
            <label>時間</label>
            <input type="time" class="dt-start">
            <span>~</span>
            <input type="time" class="dt-end">
        </div>
        <div class="dt-dialog-actions">
            <button type="button" class="dt-ok">確定</button>
            <button type="button" class="dt-cancel">取消</button>
        </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const dateInput  = overlay.querySelector('.dt-date');
    const startInput = overlay.querySelector('.dt-start');
    const endInput   = overlay.querySelector('.dt-end');
    const okBtn      = overlay.querySelector('.dt-ok');
    const cancelBtn  = overlay.querySelector('.dt-cancel');

    // 預設值
    if (oldDateStr) dateInput.value = oldDateStr;
    if (startHHmm && startHHmm !== '--:--') startInput.value = startHHmm;
    if (endHHmm   && endHHmm   !== '--:--') endInput.value   = endHHmm;

    function close() {
        overlay.remove();
    }

    cancelBtn.addEventListener('click', () => {
        close();
    });

    okBtn.addEventListener('click', async () => {
        const newDateStr = dateInput.value || oldDateStr;
        const startVal   = startInput.value;
        const endVal     = endInput.value;

        if (!newDateStr || !startVal || !endVal) {
        await window.actionDialogs.alert('Please select a date, start time and end time.', { title: 'Invalid time' });
        return;
        }

        const [shStr, smStr] = startVal.split(':');
        const [ehStr, emStr] = endVal.split(':');

        const sh = Number(shStr);
        const sm = Number(smStr);
        const eh = Number(ehStr);
        const em = Number(emStr);

        const startTotal = sh * 60 + sm;
        const endTotal   = eh * 60 + em;

        if (endTotal <= startTotal) {
        await window.actionDialogs.alert('End time must be after start time.', { title: 'Invalid time' });
        return;
        }

        const pad = n => String(n).padStart(2, '0');
        const startStr = `${pad(sh)}:${pad(sm)}`;
        const endStr   = `${pad(eh)}:${pad(em)}`;

        // 把結果交回給外面 attachTimeEditor 處理
        onConfirm({
        newDateStr,
        startStr,
        endStr,
        startTotal,
        endTotal
        });

        close();
    });
    }

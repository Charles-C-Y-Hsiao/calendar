    const trigger = document.getElementById("show-user-name");
    const dialog_close = document.getElementById("dialog-close");
    const overlay = document.getElementById("user-dialog-overlay");
    const dialog = document.querySelector(".user-dialog");
    
    dialog_close.addEventListener("click", function (e) {
        e.preventDefault();
        dialog.style.display = "none" 
        overlay.style.display = "none";
    });


    // 1. 點擊按鈕 → 顯示
    trigger.addEventListener("click", (e) => {
        e.preventDefault();
        overlay.style.display = "flex";  // 顯示遮罩
        dialog.style.display =
        (dialog.style.display === "none" || dialog.style.display === "")
        ? "flex"
        : "none";
    });

    // 2. 點背景區域 → 關閉（注意要避免點到 dialog 本體）
    // ※ e.target === overlay 的效果：➡ 避免點到 dialog 裡的 input、按鈕時關閉。
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {      // 只有點到背景才關閉
            overlay.style.display = "none";
            dialog.style.display  = "none";
        }
    });

    const input = document.getElementById("textInput");
    const clearBtn = document.querySelector(".btn-bright-green");
    const loginBtn = document.querySelector(".btn-primary");

    // 清空 input
    clearBtn.addEventListener("click", () => {
        input.value = "";
        input.classList.remove("warning");
        input.setCustomValidity(""); // 清除 validity 狀態
        input.blur();   // 讓 floating label 回到原位
    });

    // Log-in 按鈕：檢查是否 8 碼數字，通過後開啟 msg_panel
    loginBtn.addEventListener("click", () => {
        const value = input.value.trim();

        // 檢查是否為 8 碼數字（0~9）
        const isEightDigits = /^[0-9]{8}$/.test(value);


        if (!isEightDigits) {
            // 使用 msg_panel 顯示錯誤 + 倒數關閉
            openMsgWarning({
                message: "Please enter exactly 8 digits (0-9)."
            });
            return;
        }

        // 原生泡泡提示
        // if (!isEightDigits) {
        //     // 第一次：告訴瀏覽器這個欄位不合法
        //     input.setCustomValidity("Please enter exactly 8 digits (0-9).");
        //     input.reportValidity();

        //     // ★重點★：提示一次後立即把 validity 清空
        //     // 讓瀏覽器認為此欄位現在合法了（避免泡泡重複彈出）
        //     setTimeout(() => {
        //         input.setCustomValidity("");  
        //     }, 800);
        //     return;
        // }

        // // 驗證通過，清除錯誤訊息
        // input.setCustomValidity("");
        
        
        // 將資料指定給變數 name_Json
        const name_Json = value;

        // 開啟 msg_panel
        openMsgPanel({
            nameJson: name_Json,
            onSubmit: (data) => sendNameToBackend(data) // 預備傳到後端的動作
        });
    });
    // ⚠ 輕量錯誤提示面板：1 秒倒數自動關閉
    function openMsgWarning({ message, durationMs = 3000 }) {
        const overlay = document.createElement("div");
        overlay.className = "msg_panel-overlay";
        overlay.innerHTML = `
            <div class="msg_panel">
                <div class="msg_panel-title">Invalid input</div>
                <div class="msg_panel-subtitle">
                    ${message}
                </div>

                <div class="msg_panel-content">
                    This warning will close in
                    <span class="msg_panel-count">1.0</span> s
                </div>
                <div class="msg_panel-actions">
                    <button type="button" class="msg_panel-close">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const countSpan = overlay.querySelector(".msg_panel-count");
        const msg_panel_closeBtn = overlay.querySelector(".msg_panel-close");

        let remaining = durationMs;      // 毫秒
        const step = 100;               // 每 0.1 秒更新一次

        function update() {
            remaining -= step;

            if (remaining <= 0) {
            closeWarning();
            return;
            }

            const seconds = remaining / 1000;
            countSpan.textContent = seconds.toFixed(1); // 1.0 → 0.9 → 0.8 ...
        }

        const timerId = setInterval(update, step);

        function closeWarning() {
            clearInterval(timerId);
            overlay.remove();
        }
        
        msg_panel_closeBtn.addEventListener("click", closeWarning); // ===== 提早關閉 =====
    }

    // ===== msg_panel：顯示確認視窗 =====
    function openMsgPanel({ nameJson, onSubmit }) {
        const overlay = document.createElement("div");
        overlay.className = "msg_panel-overlay";
        overlay.innerHTML = `
        <div class="msg_panel">
            <div class="msg_panel-title">Confirm name data</div>
            <div class="msg_panel-subtitle">
            You are about to use the following name data:
            </div>
            <div class="msg_panel-label">name_Json</div>
            <div class="msg_panel-content">${nameJson}</div>
            <div class="msg_panel-actions">
            <button type="button" class="msg_panel-cancel">Cancel</button>
            <button type="button" class="msg_panel-submit">Submit</button>
            </div>
        </div>
        `;

        document.body.appendChild(overlay);

        const btnSubmit = overlay.querySelector(".msg_panel-submit");
        const btnCancel = overlay.querySelector(".msg_panel-cancel");

        function closeMsgPanel() {
            overlay.remove();
        }

        btnCancel.addEventListener("click", () => {
            closeMsgPanel();
        });

        btnSubmit.addEventListener("click", () => {
        // 將 nameJson 回傳給外面
        if (typeof onSubmit === "function") {
            onSubmit(nameJson);
        }
        closeMsgPanel();
        });
    }

    // ===== 預備傳到後端的函式（你之後可以改成真正的 API） =====
    async function sendNameToBackend(nameJson) {
        console.log("Ready to send to backend:", nameJson);
        setStoredCalendarUserId(nameJson);
        user_name = nameJson;

        // === ① 更新頁面上的顯示名稱 ===
        if (userNameSpan) { /*userNameSpan in setupElements.js */
            userNameSpan.textContent = `Hi, ${user_name}`;
        }

        // === ② 關閉 dialog ===
        dialog.style.display = "none";
        overlay.style.display = "none";

        // === ③ 初始化週曆 ===
        const setupInteract = initInteractForBlocks({ slotPx, stepY, stepX, dayCols });
        
        // 初始載入
        await loadWeek(viewStart, setupInteract);

        // 開啟 WS
        location.reload();

        // 之後可改成真正的 fetch，例如：
        /*
        fetch("/api/login-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameJson })
        })
        .then(res => res.json())
        .then(data => {
        console.log("Server response:", data);
        })
        .catch(err => {
        console.error("Backend error:", err);
        });
        */
    }

    // const input = document.getElementById("textInput");
    const warningText = document.getElementById("warningText");
    const counter = document.getElementById("counter");

    input.addEventListener("input", () => {
        const textLength = input.value.length;
        counter.textContent = `Entered ${textLength} / 8 characters`; // 更新 counter 文字
        // 清空舊有 class
        counter.classList.remove("counter-yellow", "counter-green", "counter-red");

        // ===== counter 顏色變化 =====
        if (textLength === 0) {
            counter.classList.remove("weight");
            counter.classList.add("counter-yellow"); // 開始 → 黃            
        }
        else if (textLength > 0 && textLength < 8) {
            counter.classList.remove("weight");
            counter.classList.add("counter-green");  // 接近 8 → 綠色            
        }
        else if (textLength === 8) {
            counter.classList.remove("weight");
            counter.classList.add("counter-green", "weight");
        }
        else if (textLength > 8) {
            counter.classList.remove("weight");
            counter.classList.add("counter-red", "weight");    // 超過 → 紅色
        }

        if (textLength > 8) {
            // input.classList.add("warning");
            warningText.style.display = "block";
            warningText.classList.remove("shake-warning");
            void warningText.offsetWidth;       // 強迫 reflow，重啟動畫
            warningText.classList.add("shake-warning");
        } else {
            // input.classList.remove("warning");
            warningText.style.display = "none";
            warningText.classList.remove("shake-warning");
        }
    });

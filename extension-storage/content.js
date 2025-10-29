// content.js

// ------------------------------------------------------------------
// 1. 获取分组：从 background.js 间接读取 Chrome Storage
// ------------------------------------------------------------------

function fetchGroupsAndNotifyBackground() {
    return new Promise((resolve, reject) => {
        // 向 background.js 发送请求，要求它从 Chrome Storage 读取分组数据
        console.log('[content.js]向 background.js 发送请求，要求它从 Chrome Storage 读取分组数据!!!!!')
        chrome.runtime.sendMessage({ type: "GET_GROUPS_FROM_STORAGE" }, (response) => {
            if (chrome.runtime.lastError) {
                console.log("获取分组数据时 runtime 错误:", chrome.runtime.lastError.message);
                resolve([]);
                return;
            }

            if (response && response.ok) {
                console.log("✅ Content Script 收到分组数据 (来自 Chrome Storage):", response.payload);
                resolve(response.payload);
            } else {
                console.log("Content Script 获取分组数据失败:", response?.log);
                resolve([]);
            }
        });
        return true;
    });
}

// content.js - 页面内 toast 提示
function showPageToast(msg, duration = 3000) {
    try {
        const id = '__bookmark_page_toast__';
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            Object.assign(el.style, {
                position: 'fixed',
                right: '20px',
                bottom: '20px',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                borderRadius: '6px',
                zIndex: '999999999',
                fontSize: '13px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            });
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        setTimeout(() => {
            if (!el) return;
            el.style.transition = 'opacity 0.4s ease';
            el.style.opacity = '0';
            setTimeout(() => {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }, 400);
        }, duration);
    } catch (e) {
        try { alert(msg); } catch (e) { }
    }
}

document.addEventListener('showPageToast', (e) => {
    showPageToast(e.detail.message);
});


// ------------------------------------------------------------------
// 2. 初始化：立即获取分组 (Background 会在响应中更新菜单)
// ------------------------------------------------------------------
fetchGroupsAndNotifyBackground(); // 首次加载时获取并触发菜单创建

// ------------------------------------------------------------------
// 3. 消息监听：处理来自 background.js 的指令
// ------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // 刷新分组指令 (由右键菜单 'refresh' 触发)————未被使用，因为没有从书签页获取数据
    if (message.type === "REFRESH_GROUPS") {
        console.log("[Content] 收到刷新分组请求，启动 A.com 同步和拉取...");

        // 核心逻辑：通知 background.js 强制 A.com 执行同步
        // chrome.runtime.sendMessage({ type: "TRIGGER_A_COM_SYNC_REQUEST" }, (response) => {
        chrome.runtime.sendMessage({ type: "TRIGGER_A_COM_SYNC_REQUEST" }, (response) => {
            if (response && response.ok) {
                // 收到 background.js 延迟回复后，再启动数据拉取流程
                console.log("[Content] A.com 同步指令已发送，现在拉取最新分组...");
                fetchGroupsAndNotifyBackground();
            } else {
                console.log("[Content] 强制 A.com 同步失败，仅拉取当前 Chrome Storage 数据。");
                fetchGroupsAndNotifyBackground();
            }
        });

        return true; // 保持异步回复
    }

    // 接收保存书签请求 (由右键菜单点击触发)
    else if (message.type === "ADD_TO_STORAGE") {
        const bookmark = message.payload;
        // console.log("[Content] 收到保存书签请求，转发至 ADD_TO_STORAGE...");
        // 直接发送 ADD_TO_STORAGE 消息给 background.js
        chrome.runtime.sendMessage({
            type: "ADD_TO_STORAGE",
            payload: bookmark
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log("[Content] 转发 ADD_TO_STORAGE 失败:", chrome.runtime.lastError.message);
                return;
            }
            if (response && response.ok) {
                // console.log('✅ 书签已保存到插件存储 (ADD_TO_STORAGE OK)。');
                document.dispatchEvent(new CustomEvent('showPageToast', {
                    detail: { message: '书签已保存到插件存储' }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('showPageToast', {
                    detail: { message: '书签保存到插件存储失败' }
                }));
            }
        });
    }

    // 接收保存书签成功通知
    else if (message.type === "BOOKMARK_SAVE_SUCCESS_NOTIFY") {
        const bookmark = message.data;
        const success = message.ok;
        console.log("[Content] 收到保存书签结果通知...", success, bookmark);
        document.dispatchEvent(new CustomEvent('showPageToast', {
            detail: { message: success ? '书签保存成功' : '书签保存失败' }
        }));
    }

    // 接收刷新分组结果通知
    else if (message.type === "SYNC_COMPLETED_UPDATE_MENU_RESULT") {
        const success = message.ok;
        console.log("[Content] 收到刷新分组结果通知...", success);
        document.dispatchEvent(new CustomEvent('showPageToast', {
            detail: { message: success ? '分组更新成功' : '分组更新失败，请打开书签页' }
        }));
    }



});
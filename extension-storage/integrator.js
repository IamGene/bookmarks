// integrator.js
// Content Script, 运行在 A.com 的隔离环境中

const GROUPS_STORAGE_KEY = 'bookmarksGroups';
const PENDING_BOOKMARKS_KEY = 'pendingBookmarks';

console.log("✅ A.com 页面集成脚本加载成功");

// 简单的页面内 toast 提示（轻量模态）
function showToast(msg, duration = 3000) {
    try {
        const id = '__bookmark_integrator_toast__';
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.style.position = 'fixed';
            el.style.right = '20px';
            el.style.bottom = '20px';
            el.style.padding = '10px 14px';
            el.style.background = 'rgba(0,0,0,0.75)';
            el.style.color = '#fff';
            el.style.borderRadius = '6px';
            el.style.zIndex = '999999999';
            el.style.fontSize = '13px';
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
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
        // fallback
        try { alert(msg); } catch (e) { /* ignore */ }
    }
}

// ====================================================================
// I. 分组同步逻辑：IndexedDB -> Content Script -> Chrome Storage
//    (初始化和强制同步时都会调用)
// ====================================================================

/**
 * 1. Content Script 向 A.com 主线程发送请求，获取 IndexedDB 分组数据
 */
async function getGroupsFromPage() {
    return new Promise(resolve => {
        const handleResponse = (event) => {
            // 安全检查：确保消息来自 A.com 自己的主线程
            if (event.origin !== window.location.origin || event.data.type !== 'GROUPS_DATA_FROM_PAGE') {
                return;
            }
            window.removeEventListener('message', handleResponse);
            resolve(event.data.groups);
        };

        window.addEventListener('message', handleResponse);

        // Content Script 发送请求给 A.com 页面主线程
        console.log("🚀 [integrator] 发送 REQUEST_GROUPS_FROM_PAGE 请求...");
        window.postMessage({ type: 'REQUEST_GROUPS_FROM_PAGE' }, window.location.origin);
    });
}

async function saveBookmark2Group(bookmark) {
    return new Promise(resolve => {
        const handleResponse = (event) => {
            // 安全检查：确保消息来自 A.com 自己的主线程
            if (event.origin !== window.location.origin || event.data.type !== 'SAVE_TO_DB_RESPONSE') {
                return;
            }
            console.log("🚀 [integrator] 收到 SAVE_TO_DB_RESPONSE 响应。", event.data);
            window.removeEventListener('message', handleResponse);
            resolve(event.data.data);
        };
        window.addEventListener('message', handleResponse);
        // Content Script 发送请求给 A.com 页面主线程
        console.log("🚀 [integrator] 发送 SAVE_TO_DB_REQUEST 请求...");
        window.postMessage({ type: 'SAVE_TO_DB_REQUEST', payload: bookmark }, window.location.origin);
    });
}


/**
 * 2. Content Script 接收到分组数据后，将其同步到 Chrome Storage
 */
async function syncGroupsToExtensionStorage(tabUrl) {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error("无法访问 Chrome Storage API。");
        return;
    }
    try {
        const currentGroups = await getGroupsFromPage();
        if (currentGroups && currentGroups.length > 0) {
            await chrome.storage.local.set({ [GROUPS_STORAGE_KEY]: currentGroups });
            console.log("✅ 分组数据已同步到 Chrome Storage。", currentGroups, tabUrl);
            // 增加延时，确保 storage 写入完成，再通知 background.js 更新菜单
            console.log("🚀 通知 background.js 更新菜单...");
            chrome.runtime.sendMessage({ type: "SYNC_COMPLETED_UPDATE_MENU", url: tabUrl });
        } else {
            console.warn("未获取到分组数据或数据为空，跳过同步。");
        }
    } catch (e) {
        console.error("同步分组数据到插件存储失败:", e);
    }
}


// ====================================================================
// II. 书签拉取逻辑：Chrome Storage -> Content Script -> IndexedDB
// ====================================================================

/**
 * 3. 检查 Chrome Storage 中是否有待处理的书签，并触发写入 IndexedDB
 */
async function transferBookmarksFromExtension() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    try {
        const result = await chrome.storage.local.get(PENDING_BOOKMARKS_KEY);
        const pendingList = result[PENDING_BOOKMARKS_KEY] || [];

        if (pendingList.length === 0) {
            console.log("Chrome Storage 中没有待处理书签。");
            return;
        }

        console.log(`🚀 发现 ${pendingList.length} 个待转移书签，开始触发写入 IndexedDB...`);
        window.postMessage({ type: 'SAVE_TO_DB_REQUEST_MANY', payload: pendingList }, window.location.origin);
        /* if (pendingList.length > 1) {
            
        } else {
            window.postMessage({ type: 'SAVE_TO_DB_REQUEST', payload: pendingList[0] }, window.location.origin);
        } */
        // 清空 Chrome Storage 中的待处理列表
        setTimeout(async () => {
            await chrome.storage.local.remove(PENDING_BOOKMARKS_KEY);
            console.log("✅ 书签转移成功，插件存储已清空。");
        }, 1000);
    } catch (e) {
        console.error("书签转移失败:", e);
    }
}


// ====================================================================
// III. 启动和监听
// ====================================================================

// 页面加载后执行分组同步和书签转移检查 (初始化流程)
window.addEventListener('load', () => {
    syncGroupsToExtensionStorage();
    transferBookmarksFromExtension();
});


// 监听来自 background.js 的通知
if (typeof chrome.runtime !== 'undefined') {

    // 将监听器回调改为 async 函数以使用 await
    chrome.runtime.onMessage.addListener(async (message) => {

        if (message.type === "NEW_DATA_PENDING") {
            console.log("🔔 收到插件通知，开始检查待转移书签...");
            await transferBookmarksFromExtension();
        }

        // ----------------------------------------------------
        // 强制同步监听：用于响应 B.com 页面的“刷新分组” 点击刷新
        // ----------------------------------------------------
        else if (message.type === "TRIGGER_A_COM_SYNC") {
            console.log("🔄 收到 background.js 强制同步请求，执行 IndexedDB -> Chrome Storage 同步...", message);
            // 1. 使用 await 等待异步同步函数执行完毕
            await syncGroupsToExtensionStorage(message.url);
        }

        else if (message.type === "SAVE_AS_BOOKMARK") {
            console.log("🔄 收到 background.js 保存书签请求...", message.payload);
            // 1. 使用 await 等待异步同步函数执行完毕
            // syncGroupsToExtensionStorage 内部已经包含了延时发送通知的逻辑，所以这里只需调用即可。
            try {
                const data = await saveBookmark2Group(message.payload);
                // 保存成功后给用户一个可见的提示（页面内 toast）
                console.log("🚀 书签保存成功，准备显示页面提示...", data);
                // chrome.runtime.sendMessage({ type: "BOOKMARK_SAVE_SUCCESS", data: data });
                chrome.runtime.sendMessage({ type: "BOOKMARK_SAVE_RESULT", data: data, ok: true });
                // showToast('已保存到书签');
            } catch (e) {
                console.error('保存书签到页面失败:', e);
                chrome.runtime.sendMessage({ type: "BOOKMARK_SAVE_RESULT", data: message.payload, ok: false });
                // showToast('保存书签失败');
            }
        }
    });
}
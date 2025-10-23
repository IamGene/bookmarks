// a_com_integrator.js
// Content Script, 运行在 A.com 的隔离环境中

const GROUPS_STORAGE_KEY = 'bookmarksGroups';
const PENDING_BOOKMARKS_KEY = 'pendingBookmarks';

console.log("✅ A.com 页面集成脚本加载成功");

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
            window.removeEventListener('message', handleResponse);////////////////
            resolve(event.data.groups);
        };

        window.addEventListener('message', handleResponse);

        // Content Script 发送请求给 A.com 页面主线程
        console.log("🚀 [a_com_integrator] 发送 REQUEST_GROUPS_FROM_PAGE 请求...");
        window.postMessage({ type: 'REQUEST_GROUPS_FROM_PAGE' }, window.location.origin);
    });
}


/**
 * 2. Content Script 接收到分组数据后，将其同步到 Chrome Storage
 */
async function syncGroupsToExtensionStorage() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        console.error("无法访问 Chrome Storage API。");
        return;
    }
    try {
        const currentGroups = await getGroupsFromPage();

        if (currentGroups && currentGroups.length > 0) {
            await chrome.storage.local.set({ [GROUPS_STORAGE_KEY]: currentGroups });
            console.log("✅ 分组数据已同步到 Chrome Storage。", currentGroups);
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

        for (const bookmark of pendingList) {
            window.postMessage({ type: 'SAVE_TO_DB_REQUEST', payload: bookmark }, window.location.origin);
        }

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
        // 强制同步监听：用于响应 B.com 页面的“刷新分组”
        // ----------------------------------------------------
        if (message.type === "TRIGGER_A_COM_SYNC") {
            console.log("🔄 收到 background.js 强制同步请求，执行 IndexedDB -> Chrome Storage 同步...");
            // 1. 使用 await 等待异步同步函数执行完毕
            await syncGroupsToExtensionStorage();

            // 2. 同步完成后，通知 background.js 更新菜单
            console.log("✅ 同步完成，通知 background.js 更新菜单...");
            chrome.runtime.sendMessage({ type: "SYNC_COMPLETED_UPDATE_MENU" });
        }
    });
}
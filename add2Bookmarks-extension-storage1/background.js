// background.js

const MAIN_MENU_ID = "add2Bookmark";
const GROUPS_STORAGE_KEY = 'bookmarksGroups';
const PENDING_BOOKMARKS_KEY = 'pendingBookmarks';
// ⚠️ 请替换为您的 A.com 实际 URL 模式
const A_COM_URL_PATTERN = "https://bookmarks-1nqv.vercel.app/*";
// const A_COM_URL_PATTERN = "http://localhost:3000/*";

// ------------------------------------------------------------------
// 菜单创建/更新函数 (保持不变)
// ------------------------------------------------------------------
function createGroupMenus(groups, parentId) {
    if (parentId === MAIN_MENU_ID) {
        const refreshId = `refresh`;
        chrome.contextMenus.create({ id: refreshId, parentId, title: '⟳ 刷新分组', contexts: ["page"] });
        chrome.contextMenus.create({ id: 'separator', parentId, type: 'separator', contexts: ["page"] });//分割线
    }

    if (groups && groups.length > 0) {
        groups.forEach(group => {
            const id = `group_${group.status}_${group.id}`;
            chrome.contextMenus.create({ id, parentId, title: group.name, contexts: ["page"] });
            if (group.children && group.children.length > 0) {
                createGroupMenus(group.children, id);
            }
        });
    } else if (parentId === MAIN_MENU_ID) {
        chrome.contextMenus.create({
            //让书签页注入integrator.js脚本,加载收藏页分组数据到插件存储
            id: 'no_groups_hint', parentId, title: '请打开书签页同步分组...', enabled: false, contexts: ["page"]
        });
    }
}


function getGroupMenus() {
    // 1. 查询 A.com 页面是否已打开
    chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
        console.log(`[Background] 查询到 ${tabs.length} 个 A.com 页面标签。`, tabs);
        if (tabs.length > 0) {
            // 2. 向所有匹配的 A.com 页面发送强制同步指令
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_A_COM_SYNC" }).catch(() => { /* 忽略发送失败的错误 */ });
            });
            return 1;
            // chrome.tabs.sendMessage(tab.id, { type: "REFRESH_GROUPS" });
        } else {
            console.log("[Background] A.com 页面未打开，无法触发同步。");
            return 0;
            // chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon48.png', title: '同步失败', message: '请先打开您的书签应用页面再刷新分组。'});
        }
    });
}



function refreshAndCreateMenus(groups) {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({ id: MAIN_MENU_ID, title: "添加到我的书签", contexts: ["page"] });
        createGroupMenus(groups, MAIN_MENU_ID);
        console.log(`[Background] 菜单已更新，包含 ${groups.length || 0} 个顶级分组。`);
    });
}

// ------------------------------------------------------------------
// 插件事件监听：安装/启动时 (保持不变)
// ------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({ id: MAIN_MENU_ID, title: "添加到我的书签", contexts: ["page"] });
        // 启动时尝试从 Chrome Storage 加载已有分组，并创建菜单
        chrome.storage.local.get([GROUPS_STORAGE_KEY], (result) => {
            refreshAndCreateMenus(result[GROUPS_STORAGE_KEY] || []);
        });
    });
});

// ------------------------------------------------------------------
// 消息监听：处理来自 Content Script 的请求
// ------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // 1. 处理 Content Script 请求从存储中读取分组的请求 (GET_GROUPS_FROM_STORAGE)
    if (message.type === "GET_GROUPS_FROM_STORAGE") {
        chrome.storage.local.get([GROUPS_STORAGE_KEY], (result) => {
            const groups = result[GROUPS_STORAGE_KEY] || [];
            refreshAndCreateMenus(groups); // 实时更新菜单
            console.log(`[Background] 响应 GET_GROUPS_FROM_STORAGE: 发现 ${groups.length} 个分组.`);
            sendResponse({ ok: true, payload: groups });
        });
        return true;
    }

    // 2. 处理 Content Script 写入待保存书签的请求 (ADD_TO_STORAGE)
    if (message.type === "ADD_TO_STORAGE") {
        const newBookmark = message.payload;
        chrome.storage.local.get([PENDING_BOOKMARKS_KEY], (result) => {
            const list = result[PENDING_BOOKMARKS_KEY] || [];
            list.push(newBookmark);
            chrome.storage.local.set({ [PENDING_BOOKMARKS_KEY]: list }, () => {
                if (chrome.runtime.lastError) {
                    console.log("[Background] 写入待处理书签失败:", chrome.runtime.lastError.message);
                    sendResponse({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log(`[Background] 成功写入 1 个待处理书签。当前总数: ${list.length}`);
                    sendResponse({ ok: true });

                    // 通知 A.com 页面有新数据待拉取
                    chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, { type: "NEW_DATA_PENDING" })
                                .catch(() => { /* 忽略发送失败 */ });
                        });
                    });
                }
            });
        });
        return true;
    }

    // 3. 处理 Content Script 发来的强制同步请求 (TRIGGER_A_COM_SYNC_REQUEST)
    if (message.type === "TRIGGER_A_COM_SYNC_REQUEST") {
        chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
            if (tabs.length === 0) {
                console.log("[Background] A.com 页面未打开，无法触发同步。");
                // 允许 Content Script 继续拉取旧数据
                sendResponse({ ok: true, message: "A.com not open" });
                return;
            }

            // A.com 已打开，发送指令
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_A_COM_SYNC" }).catch(() => {/* 忽略 */ });
            });

            // 延迟回复，确保 A.com 有时间执行 IndexedDB 读取和 Chrome Storage 写入
            setTimeout(() => {
                console.log("[Background] 已通知 A.com 同步，延迟回复 Content Script...");
                sendResponse({ ok: true });
            }, 500);
        });
        return true;
    }

    // 4. (新增) 处理 a_com_integrator.js 同步完成后的菜单更新请求
    if (message.type === "SYNC_COMPLETED_UPDATE_MENU") {
        console.log("[Background] 收到 A.com 同步完成通知，正在从存储中读取最新分组以更新菜单...");
        chrome.storage.local.get([GROUPS_STORAGE_KEY], (result) => {
            const groups = result[GROUPS_STORAGE_KEY] || [];
            refreshAndCreateMenus(groups); // 使用最新数据刷新菜单
        });
        // 这里不需要 sendResponse，因为是单向通知
        return;
    }

});

// ------------------------------------------------------------------
// 右键菜单点击事件 (onClicked)
// ------------------------------------------------------------------
function getGroupMenus() {
    // 1. 查询 A.com 页面是否已打开
    chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
        console.log(`[Background] 查询到 ${tabs.length} 个 A.com 页面标签。`, tabs);
        if (tabs.length > 0) {
            // 2. 向所有匹配的 A.com 页面发送强制同步指令
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_A_COM_SYNC" }).catch(() => { /* 忽略发送失败的错误 */ });
            });
            // chrome.tabs.sendMessage(tab.id, { type: "REFRESH_GROUPS" });
        } else {
            console.log("[Background] A.com 页面未打开，无法触发同步。");
            // chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon48.png', title: '同步失败', message: '请先打开您的书签应用页面再刷新分组。'});
        }
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) { console.log("Tab 信息丢失。"); return; }

    // 点击的是分组菜单项：触发保存书签流程
    if (info.menuItemId.startsWith("group_")) {
        const idString = info.menuItemId.substring("group_".length);
        const firstUnderscoreIndex = idString.indexOf('_');
        if (firstUnderscoreIndex === -1) { console.log("无效的菜单项ID格式:", info.menuItemId); return; }

        const status = idString.substring(0, firstUnderscoreIndex);
        const groupId = idString.substring(firstUnderscoreIndex + 1);

        const bookmark = {
            title: tab.title, url: tab.url, icon: tab.favIconUrl, groupId,
            status: parseInt(status, 10)
        };

        // 发送 SAVE_BOOKMARK 给 content.js

        chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
            console.log(`[Background] 查询到 ${tabs.length} 个 A.com 页面标签。`, tabs);
            if (tabs.length > 0) {
                // 2. 向所有匹配的 A.com 页面发送强制同步指令
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: "SAVE_AS_BOOKMARK", payload: bookmark }).catch(() => { /* 忽略发送失败的错误 */ });
                });
                // return 1;
                // chrome.tabs.sendMessage(tab.id, { type: "REFRESH_GROUPS" });
            } else {
                console.log("[Background] A.com 页面未打开，无法触发同步。");
                chrome.tabs.sendMessage(tab.id, { type: "SAVE_BOOKMARK", payload: bookmark });
                // return 0;
                // chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon48.png', title: '同步失败', message: '请先打开您的书签应用页面再刷新分组。'});
            }
        });

    }

    // 点击的是刷新菜单项：触发 content.js 启动强制同步
    else if (info.menuItemId === 'refresh') {
        console.log('[Background] 点击了刷新菜单，正在通知 A.com 页面同步分组...');
        getGroupMenus();
    }
});
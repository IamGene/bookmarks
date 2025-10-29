// background.js

const MAIN_MENU_ID = "add2Bookmark";
const GROUPS_STORAGE_KEY = 'bookmarksGroups';
const PENDING_BOOKMARKS_KEY = 'pendingBookmarks';
// ⚠️ 请替换为您的 A.com 实际 URL 模式
// const A_COM_URL_PATTERN = "https://bookmarks-1nqv.vercel.app/*";
const A_COM_URL_PATTERN = "http://localhost:3000/*";

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


function getGroupMenus(tabUrl) {
    // 1. 查询 A.com 页面是否已打开
    // console.log(`[Background] 查询 A.com 页面标签。`, tabUrl);
    chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
        console.log(`[Background] 查询到 ${tabs.length} 个 A.com 页面标签。`, tabs);
        if (tabs.length > 0) {
            // 2. 向所有匹配的 A.com 页面发送强制同步指令
            /* tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_A_COM_SYNC" }).catch(() => {  });
            }); */
            const tab = tabs[tabs.length - 1];
            chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_A_COM_SYNC", url: tabUrl }).catch(() => { /* 忽略发送失败的错误 */ });
            // chrome.tabs.sendMessage(tab.id, { type: "REFRESH_GROUPS" });
        } else {
            // console.log("[Background] A.com 页面未打开，无法触发同步。");
            chrome.tabs.query({ url: tabUrl }, (tabs) => {
                if (tabs.length > 0) {
                    console.log(`[Background] 查询到 ${tabs.length} 个B.com 页面标签,准备发送同步分组数据结果：失败。`, tabs);
                    // 2. 向所有匹配的 B.com 页面发送强制同步指令
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, { type: "SYNC_COMPLETED_UPDATE_MENU_RESULT", data: tabUrl, ok: false })
                            .catch(() => { });
                    });
                }
                // else { }
                // console.log("[Background] B.com 页面未打开，无法触发同步。");//忽略
            });
            // chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon48.png', title: '同步失败', message: '请先打开您的书签应用页面再刷新分组。'});
        }
    });
}


function addBoomark2Storage(bookmark, tab) {
    chrome.tabs.query({ url: tab.url }, (tabs) => {
        if (tabs.length > 0) {
            console.log(`[Background] 查询到 ${tabs.length} 个B.com 页面标签,通知进行缓存...`, tabs);
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "ADD_TO_STORAGE", payload: bookmark })
                    .catch(() => { });
            });
        } else {
            console.log("[Background] B.com 页面未打开，无法触发同步。");//忽略
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
                    /*  chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
                         tabs.forEach(tab => {
                             chrome.tabs.sendMessage(tab.id, { type: "NEW_DATA_PENDING" })
                                 .catch(() => {  });
                         });
                     }); */
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

    // 4. (新增) 处理 integrator.js 同步完成后的菜单更新请求
    if (message.type === "SYNC_COMPLETED_UPDATE_MENU") {
        console.log("[Background] 收到 A.com 同步完成通知，正在从存储中读取最新分组以更新菜单...", message.url);
        chrome.storage.local.get([GROUPS_STORAGE_KEY], (result) => {
            const groups = result[GROUPS_STORAGE_KEY] || [];
            refreshAndCreateMenus(groups); // 使用最新数据刷新菜单
        });

        chrome.tabs.query({ url: message.url }, (tabs) => {
            // console.log(`[Background] 查询到 ${tabs.length} 个B.com 页面标签。`, tabs);
            if (tabs.length > 0) {
                console.log(`[Background] 查询到 ${tabs.length} 个B.com 页面标签,准备同步分组数据。`, tabs);
                // 2. 向所有匹配的 B.com 页面发送强制同步指令
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: "SYNC_COMPLETED_UPDATE_MENU_RESULT", data: message, ok: true })
                        .catch(() => { });
                });
            } else {
                console.log("[Background] B.com 页面未打开，无法触发同步。");//忽略
            }
        });
        // 这里不需要 sendResponse，因为是单向通知
        return;
    }

    if (message.type === "BOOKMARK_SAVE_RESULT") {
        console.log("[Background] 收到 A.com 保存书签结果通知...", message.data);
        chrome.tabs.query({ url: message.data.url }, (tabs) => {
            console.log(`[Background] 查询到 ${tabs.length} 个B.com 页面标签。`, tabs);
            if (tabs.length > 0) {
                // 2. 向所有匹配的 B.com 页面发送强制同步指令
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: "BOOKMARK_SAVE_SUCCESS_NOTIFY", data: message.data, ok: message.ok }).catch(() => { /* 忽略发送失败的错误 */ });
                });
            } else {
                console.log("[Background] B.com 页面未打开，无法触发同步。");//忽略
            }
        });
        /*  chrome.storage.local.get([GROUPS_STORAGE_KEY], (result) => {
             const groups = result[GROUPS_STORAGE_KEY] || [];
             refreshAndCreateMenus(groups); // 使用最新数据刷新菜单
         });
         // 这里不需要 sendResponse，因为是单向通知
         return; */
    }

});


// ------------------------------------------------------------------
// 右键菜单点击事件 (onClicked)
// ------------------------------------------------------------------
/* function getGroupMenus() {
    // 1. 查询 A.com 页面是否已打开
    chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
        console.log(`[Background] 查询到 ${tabs.length} 个 A.com 页面标签。`, tabs);
        if (tabs.length > 0) {
            // 2. 向所有匹配的 A.com 页面发送强制同步指令
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_A_COM_SYNC" }).catch(() => { });
            });
            // chrome.tabs.sendMessage(tab.id, { type: "REFRESH_GROUPS" });
        } else {
            console.log("[Background] A.com 页面未打开，无法触发同步。");
            // chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon48.png', title: '同步失败', message: '请先打开您的书签应用页面再刷新分组。'});
        }
    });
} */

function uuid() {
    return Math.random().toString(36).substr(2, 9);
}

async function sendToTabsWithDelay(tabs, message, delay = 100) {
    for (const tab of tabs) {
        try {
            await chrome.tabs.sendMessage(tab.id, message);
        } catch (e) {
            // 忽略异常（比如content script未加载）
        }
        // 每次发送后等待 delay 毫秒
        await new Promise(resolve => setTimeout(resolve, delay));
    }
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
            title: tab.title, url: tab.url, icon: tab.favIconUrl, groupId, id: uuid(),
            status: parseInt(status, 10)
        };

        // 发送 SAVE_BOOKMARK 给 content.js
        chrome.tabs.query({ url: A_COM_URL_PATTERN }, (tabs) => {
            console.log(`[Background] 查询到 ${tabs.length} 个 A.com 页面标签。onClicked SAVE_AS_BOOKMARK `, tabs);
            if (tabs.length > 0) {
                // 只向第一个匹配的 A.com 页面发送一次保存书签指令，避免重复处理
                sendToTabsWithDelay(tabs, { type: "SAVE_AS_BOOKMARK", payload: bookmark }, 100);
                /* tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: "SAVE_AS_BOOKMARK", payload: bookmark }).catch(() => { });
                }); */
            } else {
                console.log("[Background] A.com 页面未打开，无法触发同步。");
                //方案A：通知B.com 页面书签保存失败
                /*  chrome.tabs.query({ url: tab.url }, (tabs) => {
                     console.log(`[Background] 查询到 ${tabs.length} 个 B.com 页面标签。SAVE_AS_BOOKMARK_FAILED `, tabs);
                     if (tabs.length > 0) {
                         chrome.tabs.sendMessage(tab.id, { type: "BOOKMARK_SAVE_SUCCESS_NOTIFY", data: bookmark, ok: false }).catch(() => { });
                     } else {
                         console.log("[Background] B.com 页面未打开，无法通知。");
                     }
                 }); */

                //方案B:暂存到插件缓存
                //[background.js:ADD_TO_STORAGE] --> [content.js:ADD_TO_STORAGE] -->  [background.js:ADD_TO_STORAGE]
                addBoomark2Storage(bookmark, tab);
            }
        });

    }

    // 点击的是刷新菜单项：触发 content.js 启动强制同步
    else if (info.menuItemId === 'refresh') {
        console.log('[Background] 点击了刷新菜单，正在通知 A.com 页面同步分组...', tab);
        getGroupMenus(tab.url);
    }
});
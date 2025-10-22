// content.js

// ------------------------------------------------------------------
// 1. 获取分组：从 background.js 间接读取 Chrome Storage
// ------------------------------------------------------------------

function fetchGroupsAndNotifyBackground() {
    return new Promise((resolve, reject) => {
        // 向 background.js 发送请求，要求它从 Chrome Storage 读取分组数据
        console.log('向 background.js 发送请求，要求它从 Chrome Storage 读取分组数据!!!!!')
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

// ------------------------------------------------------------------
// 2. 初始化：立即获取分组 (Background 会在响应中更新菜单)
// ------------------------------------------------------------------
fetchGroupsAndNotifyBackground(); // 首次加载时获取并触发菜单创建

// ------------------------------------------------------------------
// 3. 消息监听：处理来自 background.js 的指令
// ------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // 刷新分组指令 (由右键菜单 'refresh' 触发)
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
    if (message.type === "SAVE_BOOKMARK") {
        const bookmark = message.payload;

        console.log("[Content] 收到保存书签请求，转发至 ADD_TO_STORAGE...");

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
                console.log('✅ 书签已保存到插件存储 (ADD_TO_STORAGE OK)。');
            } else {
                console.log('书签保存到插件存储失败 (ADD_TO_STORAGE 失败)。');
            }
        });
    }
});
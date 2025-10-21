import { getCollectPageGroups, saveBookmarkToDB } from '@/db/bookmarksPages';
// TODO: 后续可以引入 saveBookmarkToDB 函数用于保存书签

console.log("✅ Extension Helper 加载成功");

/** 心跳检测 */
const handlePing = (event: MessageEvent) => {
    console.log('PING 收到，回复 PONG');
    window.parent.postMessage({ type: 'PONG' }, '*');
};

/** 获取分组列表 */
const handleListGroups = async (event: MessageEvent) => {
    console.log('开始获取分组数据...');
    try {
        const groups = await getCollectPageGroups();
        console.log('helper 已返回分组数据', groups);
        window.parent.postMessage({ type: 'GROUPS_RESPONSE', payload: groups }, '*');
    } catch (err) {
        console.error('获取分组失败:', err);
        window.parent.postMessage({ type: 'GROUPS_RESPONSE', payload: [] }, '*');
    }
};

/** 保存书签 */
const handleSaveBookmark = async (event: MessageEvent, payload: any) => {
    console.log('准备保存书签:', payload);
    try {
        // TODO: 这里可以调用 saveBookmarkToDB(payload)
        // console.log("收到保存请求11111：", payload);
        const res = saveBookmarkToDB(payload);
        // const data = { title, url, icon, groupId, status };
        // console.log('书签保存成功（模拟）2');
        window.parent.postMessage({ type: 'SAVE_RESULT', payload: { ok: true } }, '*');
    } catch (err: any) {
        console.error('保存书签失败:', err);
        window.parent.postMessage({ type: 'SAVE_RESULT', payload: { ok: false, error: err.message } }, '*');
    }
};

// helper 监听来自扩展的消息
window.addEventListener("message", async (event) => {

    // 调试信息：收到消息时打印消息内容
    console.log("收到消息11:", event.data);

    // 我们只关心来自我们自己的窗口或可信来源的消息
    // 在生产环境中，您应该将 event.origin 与您的插件ID进行严格比较
    // 例如: if (event.origin !== 'chrome-extension://your-extension-id') return;
    /* if (event.source !== window || !event.data || !event.data.type) {
        return;
    } */
    // 安全校验：同源消息
    // if (event.origin !== window.location.origin) return;

    const { type, payload } = event.data || {};
    console.log('消息 type:', type);

    switch (type) {
        case 'PING':
            handlePing(event);
            break;
        case 'LIST_GROUPS':
            await handleListGroups(event);
            break;
        case 'SAVE_BOOKMARK':
            await handleSaveBookmark(event, payload);
            break;
        default:
            console.warn('未知消息类型:', type);
    }

    // const { type, payload } = event.data;
    // console.log("消息:type", type); // 调试用

    // 响应 "心跳检测"，用于确认 helper 页面已准备就绪
    /* if (type === "PING") {
        window.postMessage({ type: "PONG" }, event.origin);
    }

    // 当接收到来自 content.js 的 LIST_GROUPS 消息时
    if (type === "LIST_GROUPS") {
        // ✅ 调用函数从 IndexedDB 获取真实的分组数据
        const groups = await getCollectPageGroups();

        // 调试信息：在控制台打印获取到的分组数据
        console.log("从数据库获取的分组数据:", groups);
        // 将分组数据发送回 content.js
        window.parent.postMessage({ type: 'GROUPS_RESPONSE', payload: groups }, '*');
    }

    // 当收到保存书签的请求时
    if (type === "SAVE_BOOKMARK") {
        // 从消息负载中提取书签信息
        const { title, url, icon, groupId, status } = payload;

        // ✅ 暂时打印，下一步可以换成调用真正的数据库写入函数
        console.log("收到保存请求：", { title, url, icon, groupId, status });

        // 告诉请求方保存成功 (这里可以根据实际保存结果返回成功或失败)
        window.postMessage({ type: "SAVE_RESULT", payload: { ok: true } }, event.origin);
    } */
});

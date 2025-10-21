import { getCollectPageGroups } from '@/src/db/bookmarksPages';
// TODO: 后续可以引入 saveBookmarkToDB 函数用于保存书签

console.log("✅ Extension Helper 加载成功");
// helper 监听来自扩展的消息
window.addEventListener("message", async (event) => {

    // 调试信息：收到消息时打印消息内容
    console.log("收到消息1:", event.data);

    // 我们只关心来自我们自己的窗口或可信来源的消息
    // 在生产环境中，您应该将 event.origin 与您的插件ID进行严格比较
    // 例如: if (event.origin !== 'chrome-extension://your-extension-id') return;
    if (event.source !== window || !event.data || !event.data.type) {
        return;
    }

    const { type, payload } = event.data;
    console.log("消息:type", type); // 调试用

    // 响应 "心跳检测"，用于确认 helper 页面已准备就绪
    if (type === "PING") {
        window.postMessage({ type: "PONG" }, event.origin);
    }

    // 当接收到来自 content.js 的 LIST_GROUPS 消息时
    if (type === "LIST_GROUPS") {
        // ✅ 调用函数从 IndexedDB 获取真实的分组数据
        const groups = await getCollectPageGroups();

        // 调试信息：在控制台打印获取到的分组数据
        console.log("从数据库获取的分组数据:", groups);

        // 将分组数据发送回 content.js
        window.postMessage(
            { type: "GROUPS_RESPONSE", payload: groups },
            event.origin
        );
    }


    // 当收到保存书签的请求时
    if (type === "SAVE_BOOKMARK") {
        // 从消息负载中提取书签信息
        const { title, url, icon, groupId, status } = payload;

        // ✅ 暂时打印，下一步可以换成调用真正的数据库写入函数
        // console.log("收到保存请求11111：", { title, url, icon, groupId, status });
        const data = { title, url, icon, groupId, status };
        // const saveRes = await saveWebTag(data);
        // 告诉请求方保存成功 (这里可以根据实际保存结果返回成功或失败)
        window.postMessage({ type: "SAVE_RESULT", payload: { ok: true } }, event.origin);

    }
});

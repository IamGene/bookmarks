export default async function handler(req, res) {
    // 设置 CORS（很重要，否则插件 fetch 会被拦）
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end(); // 处理预检请求
    }

    if (req.method === "GET") {
        // 这里返回示例数据，你可以替换成数据库或云存储数据
        const groups = [
            { id: "1", name: "默认分组", status: 0, children: [] },
            { id: "2", name: "收藏页", status: 1, children: [] }
        ];

        return res.status(200).json(groups);
    }

    return res.status(405).json({ message: "Method not allowed" });
}

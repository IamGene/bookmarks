export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method === "POST") {
        try {
            const bookmark = req.body;
            console.log("📦 收到书签:", bookmark);

            // 这里暂时只是返回收到的数据
            // 后续你可以把数据写入数据库
            return res.status(200).json({
                message: "书签保存成功",
                bookmark
            });
        } catch (err) {
            console.error("保存失败:", err);
            return res.status(500).json({ message: "服务器错误" });
        }
    }

    return res.status(405).json({ message: "Method not allowed" });
}

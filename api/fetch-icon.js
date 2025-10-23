export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send("Missing url");

    try {
        const response = await fetch(url);
        if (!response.ok)
            return res.status(response.status).send("Failed to fetch favicon");

        const buffer = await response.arrayBuffer();
        res.setHeader(
            "Content-Type",
            response.headers.get("content-type") || "image/x-icon"
        );
        res.setHeader("Cache-Control", "public, max-age=604800"); // 缓存一周
        res.send(Buffer.from(buffer));
    } catch (err) {
        console.error("Fetch favicon error:", err);
        res.status(500).send("Error fetching favicon");
    }
}

// ==================== CONFIG =====================
const YOUR_API_KEYS = ["SPLEXXO"];
const TARGET_API = "https://ai-of30.onrender.com/ask";
const TARGET_API_KEY = "CODEX";
const CACHE_TIME = 3600 * 1000;
// =================================================

const cache = new Map();

function cleanOxmzoo(value) {
    if (typeof value == "string") {
        return value.replace(/@oxmzoo/gi, "").trim();
    }
    if (Array.isArray(value)) {
        return value.map(cleanOxmzoo);
    }
    if (value && typeof value === "object") {
        const cleaned = {};
        for (const key of Object.keys(value)) {
            if (key.toLowerCase().includes("oxmzoo")) continue;
            cleaned[key] = cleanOxmzoo(value[key]);
        }
        return cleaned;
    }
    return value;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    // Sirf GET allow
    if (req.method !== "GET") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(405).json({ error: "method not allowed" });
    }

    const { message, key } = req.query || {};

    // Param check
    if (!message || !key) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ 
            error: "missing parameters", 
            details: "Use: ?message=YourQuestion&key=SPLEXXO" 
        });
    }

    const cleanMessage = String(message).trim();
    const cleanKey = String(key).trim();

    // API key check
    if (!YOUR_API_KEYS.includes(cleanKey)) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(403).json({ error: "invalid key" });
    }

    // Cache check
    const now = Date.now();
    const cacheKey = cleanMessage;
    const cached = cache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TIME) {
        res.setHeader("X-Proxy-Cache", "HIT");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(cached.response);
    }

    // AI Chat API call
    const url = `${TARGET_API}?message=${encodeURIComponent(cleanMessage)}&key=${TARGET_API_KEY}`;

    try {
        const upstream = await fetch(url);

        const raw = await upstream.text();

        if (!upstream.ok || !raw) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            return res.status(502).json({
                error: "AI API failed",
                details: `HTTP ${upstream.status}`,
            });
        }

        let responseBody;

        try {
            // JSON try parse
            let data = JSON.parse(raw);

            // @oxmzoo clean
            data = cleanOxmzoo(data);

            // Apna clean branding
            data.developer = "splexxo";
            data.credit_by = "splexx";
            data.powered_by = "splexxo-info-api";

            responseBody = JSON.stringify(data);
        } catch (e) {
            // Agar JSON nahi hai, to raw text se @oxmzoo hata do
            const cleanedText = raw.replace(/@oxmzoo/gi, "").trim();
            responseBody = cleanedText;
        }

        // Cache save
        cache.set(cacheKey, {
            timestamp: Date.now(),
            response: responseBody,
        });

        res.setHeader("X-Proxy-Cache", "MISS");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(200).send(responseBody);
    } catch (err) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(502).json({
            error: "AI API request error",
            details: err.message || "unknown error",
        });
    }
}

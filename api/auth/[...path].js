// Catch-all proxy: /api/auth/* → Neon Auth /*
// Avoids CORS "Invalid origin" by proxying through our own domain
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
  if (req.method === "OPTIONS") return res.status(204).end();

  const authUrl = process.env.VITE_NEON_AUTH_URL;
  if (!authUrl) return res.status(500).json({ error: "VITE_NEON_AUTH_URL not set" });

  // Extract the path after /api/auth/
  const path = req.query.path ? (Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path) : "";
  const url = `${authUrl}/${path}`;

  try {
    const headers = { "Content-Type": "application/json" };
    if (req.headers.cookie) headers["Cookie"] = req.headers.cookie;
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;

    const opts = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      opts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(url, opts);
    const data = await upstream.text();

    // Forward set-cookie headers
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.setHeader("Set-Cookie", setCookie);

    res.status(upstream.status).setHeader("Content-Type", upstream.headers.get("content-type") || "application/json").send(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Auth proxy failed" });
  }
}

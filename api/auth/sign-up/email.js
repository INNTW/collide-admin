export default async function handler(req, res) {
  if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Origin","*"); res.setHeader("Access-Control-Allow-Headers","Content-Type"); return res.status(204).end(); }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const authUrl = process.env.VITE_NEON_AUTH_URL;
  if (!authUrl) return res.status(500).json({ error: "VITE_NEON_AUTH_URL not set" });
  try {
    const r = await fetch(`${authUrl}/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", "Origin": authUrl }, body: JSON.stringify(req.body) });
    const data = await r.text();
    res.status(r.status).setHeader("Content-Type", "application/json").send(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

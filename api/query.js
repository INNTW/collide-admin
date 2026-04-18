import { neon } from "@neondatabase/serverless";

// Proxy all PostgREST-style queries to Neon via serverless driver
// This bypasses the Data API JWT requirement entirely
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Prefer, Accept, X-User-Email");
  if (req.method === "OPTIONS") return res.status(204).end();

  let url = process.env.NEON_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL || "";
  url = url.replace("-pooler.", ".");
  if (!url) return res.status(500).json({ error: "NEON_DATABASE_URL not set" });

  const sql = neon(url);

  // Get table from query param
  const table = req.query.table;
  if (!table || !/^[a-z_]+$/.test(table)) return res.status(400).json({ error: "Invalid table" });

  try {
    if (req.method === "GET") {
      // SELECT
      const select = req.query.select || "*";
      let q = `SELECT ${select} FROM public.${table}`;
      const where = [];
      const params = [];
      // Parse PostgREST-style filters from query params
      for (const [key, val] of Object.entries(req.query)) {
        if (key === "table" || key === "select" || key === "order" || key === "limit" || key === "offset") continue;
        if (typeof val === "string" && val.startsWith("eq.")) {
          params.push(val.slice(3));
          where.push(`${key} = $${params.length}`);
        } else if (typeof val === "string" && val.startsWith("neq.")) {
          params.push(val.slice(4));
          where.push(`${key} != $${params.length}`);
        } else if (typeof val === "string" && val.startsWith("is.")) {
          where.push(`${key} IS ${val.slice(3) === "null" ? "NULL" : val.slice(3)}`);
        } else if (typeof val === "string" && val.startsWith("in.")) {
          const vals = val.slice(4, -1).split(",");
          const placeholders = vals.map((v, i) => { params.push(v); return `$${params.length}`; });
          where.push(`${key} IN (${placeholders.join(",")})`);
        }
      }
      if (where.length) q += ` WHERE ${where.join(" AND ")}`;
      if (req.query.order) {
        const [col, dir] = req.query.order.split(".");
        q += ` ORDER BY ${col} ${dir === "desc" ? "DESC" : "ASC"}`;
      }
      if (req.query.limit) q += ` LIMIT ${parseInt(req.query.limit)}`;
      if (req.query.offset) q += ` OFFSET ${parseInt(req.query.offset)}`;

      const rows = await sql.query(q, params);
      return res.status(200).json(rows);

    } else if (req.method === "POST") {
      // INSERT
      const records = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      for (const record of records) {
        const keys = Object.keys(record);
        const vals = Object.values(record);
        const ph = keys.map((_, i) => `$${i + 1}`).join(", ");
        const rows = await sql.query(`INSERT INTO public.${table} (${keys.join(", ")}) VALUES (${ph}) RETURNING *`, vals);
        if (rows.length) results.push(rows[0]);
      }
      return res.status(201).json(results);

    } else if (req.method === "PATCH") {
      // UPDATE
      const sets = [], params = [];
      for (const [k, v] of Object.entries(req.body)) {
        params.push(v);
        sets.push(`${k} = $${params.length}`);
      }
      const where = [];
      for (const [key, val] of Object.entries(req.query)) {
        if (key === "table") continue;
        if (typeof val === "string" && val.startsWith("eq.")) {
          params.push(val.slice(3));
          where.push(`${key} = $${params.length}`);
        }
      }
      if (!where.length) return res.status(400).json({ error: "Update needs filters" });
      const rows = await sql.query(`UPDATE public.${table} SET ${sets.join(", ")} WHERE ${where.join(" AND ")} RETURNING *`, params);
      return res.status(200).json(rows);

    } else if (req.method === "DELETE") {
      const where = [], params = [];
      for (const [key, val] of Object.entries(req.query)) {
        if (key === "table") continue;
        if (typeof val === "string" && val.startsWith("eq.")) {
          params.push(val.slice(3));
          where.push(`${key} = $${params.length}`);
        }
      }
      if (!where.length) return res.status(400).json({ error: "Delete needs filters" });
      const rows = await sql.query(`DELETE FROM public.${table} WHERE ${where.join(" AND ")} RETURNING *`, params);
      return res.status(200).json(rows);
    }
  } catch (err) {
    console.error("Query error:", err);
    return res.status(500).json({ error: err.message || "Query failed" });
  }
}

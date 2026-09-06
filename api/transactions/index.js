import { filterRows } from "../lib/data.js";

export default function handler(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.max(1, parseInt(req.query.pageSize) || 10);

  const filtered = filterRows(req.query);
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  res.status(200).json({ total: filtered.length, rows });
}
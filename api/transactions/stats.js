import { ALL_ROWS, withinDateRange } from "../_lib/data.js";

export default function handler(req, res) {
  const { dateStart, dateEnd } = req.query;
  const rows = ALL_ROWS.filter((r) => withinDateRange(r, dateStart, dateEnd));

  const totalSales = rows
    .filter((r) => r.status === "Success")
    .reduce((sum, r) => sum + r.amount, 0);
  const refundedTransactions = rows.filter((r) => r.type === "Refund").length;

  res.status(200).json({
    currency: "EGP",
    totalSales: Number(totalSales.toFixed(2)),
    totalTransactions: rows.length,
    refundedTransactions,
  });
}
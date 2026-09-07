const CUSTOMERS = [
  "Ahmed Mohamed", "Youssef", "YOUSSEF", "YOUSSESF TESTS",
  "Sara Adel", "Mona Khalil", "Karim Hassan",
];
const CARD_BRANDS = ["mc", "mc", "mc", "visa", "mc"];
const TYPES = ["Authorize", "Authorize", "Capture", "Authorize", "Refund"];
const CURRENCIES = ["EGP", "EGP", "EGP", "EGP", "USD", "SAR"];
const PAYMENT_METHODS = ["Card", "Card", "Card", "Card", "Wallet", "Cash"];
const CHANNELS = ["Online", "Online", "Online", "POS", "App"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildData() {
  let trnx = 7390520;
  let order = 974201;
  const rows = [];
  let cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const status = i < 52 ? "Success" : pick(["Failed", "Pending", "Success"]);
    const paymentMethod = pick(PAYMENT_METHODS);
    const cardBrand = pick(CARD_BRANDS);
    const createdAt = new Date(cursor);
    cursor = new Date(cursor.getTime() - randInt(60, 600) * 60 * 1000);
    rows.push({
      id: `txn_${trnx}`,
      amount: i === 2 ? 3000 : Number((Math.random() * 180 + 3).toFixed(2)),
      currency: pick(CURRENCIES),
      status,
      paymentMethod,
      cardBrand,
      last4: cardBrand === "visa" ? "1111" : "2346",
      customer: pick(CUSTOMERS),
      sub: Math.random() > 0.3 ? String(randInt(200000000000, 201999999999)) : "0",
      trnx: trnx--,
      type: pick(TYPES),
      channel: pick(CHANNELS),
      createdAt: createdAt.toISOString(),
      order: order--,
    });
  }
  return rows;
}

export const ALL_ROWS = buildData();

export function withinDateRange(row, dateStart, dateEnd) {
  if (!dateStart && !dateEnd) return true;
  const created = new Date(row.createdAt).getTime();
  if (dateStart && created < new Date(dateStart + "T00:00:00").getTime()) return false;
  if (dateEnd && created > new Date(dateEnd + "T23:59:59.999").getTime()) return false;
  return true;
}

const EXTRA_FIELD_MAP = {
  "Transaction ID": (r) => String(r.trnx),
  "Order ID": (r) => String(r.order),
  "Merchant Order ID": (r) => String(r.order),
};

export function filterRows(query) {
  const { status, currency, method, type, channel, dateStart, dateEnd, field, q } = query;
  let rows = ALL_ROWS;

  if (status) rows = rows.filter((r) => r.status.toLowerCase() === String(status).toLowerCase());
  if (currency) rows = rows.filter((r) => r.currency === currency);
  if (method) rows = rows.filter((r) => r.paymentMethod === method);
  if (type) rows = rows.filter((r) => r.type === type);
  if (channel) rows = rows.filter((r) => r.channel === channel);
  rows = rows.filter((r) => withinDateRange(r, dateStart, dateEnd));

  if (field && q) {
    const getField = EXTRA_FIELD_MAP[field];
    rows = getField ? rows.filter((r) => getField(r).toLowerCase().includes(String(q).toLowerCase())) : [];
  }

  return rows;
}

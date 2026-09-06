# Transactions Dashboard (React + Express API)

React + Vite + Tailwind frontend, wired to a small Express API in
`server/`. The frontend never touches mock data directly — every number on
screen comes from `fetch()` calls in `src/api.js` hitting the real server.

## Run it

```bash
npm install
npm run dev
```

This starts **both** the API (port 4000) and the Vite dev server (port
5173) together, with colored `API` / `WEB` log prefixes. Open the URL Vite
prints (usually http://localhost:5173).

If you'd rather run them separately (two terminals):

```bash
npm run server   # http://localhost:4000
npm run client   # http://localhost:5173
```

## Swapping in a real backend later

Everything the server currently fakes lives in `server/index.js` inside
one `buildData()` function and two route handlers. Replace `buildData()`
with a real database query (or point `src/api.js`'s `VITE_API_BASE_URL` at
Paymob's real API through your own proxy) — the routes and response
shapes are already documented below, so the frontend doesn't need to
change either way.

## API contract

The dashboard calls two endpoints. Implement them however you like (Node,
PHP, a serverless function, a thin proxy in front of Paymob's real API,
whatever you've got) — as long as the shapes below match.

### `GET /api/transactions`

Query params sent by the frontend:

| param      | example        | meaning                                              |
|------------|----------------|-------------------------------------------------------|
| `status`   | `success`      | `success` \| `pending` \| `failed` — omitted for "All" |
| `currency` | `EGP`          | omitted for "All"                                      |
| `method`   | `Card`         | `Card` \| `Wallet` \| `Cash` — omitted for "All"       |
| `type`     | `Authorize`    | `Authorize` \| `Capture` \| `Refund` — omitted for "All"|
| `channel`  | `Online`       | `Online` \| `POS` \| `App` — omitted for "All"         |
| `dateStart`| `2026-08-06`   | ISO date, inclusive                                    |
| `dateEnd`  | `2026-09-04`   | ISO date, inclusive                                    |
| `field`    | `Order ID`     | present only when the "+" advanced filter is used      |
| `q`        | `974201`       | the search value for `field`                           |
| `page`     | `1`            | 1-indexed                                              |
| `pageSize` | `10`           | `10` \| `25` \| `50` \| `100`                          |

Expected response:

```json
{
  "total": 31,
  "rows": [
    {
      "id": "txn_7390520",
      "amount": 154.23,
      "currency": "EGP",
      "status": "Success",
      "paymentMethod": "Card",
      "cardBrand": "mc",
      "last4": "2346",
      "customer": "Ahmed Mohamed",
      "sub": "201156361717",
      "trnx": 7390520,
      "type": "Authorize",
      "channel": "Online",
      "createdAt": "2026-09-05T16:14:00.000Z",
      "order": 974201
    }
  ]
}
```

`status` in the response should be `"Success"`, `"Failed"`, or `"Pending"`
(capitalized) — that's what drives the colored badge.

### `GET /api/transactions/stats`

Query params: `dateStart`, `dateEnd` (same meaning as above).

Expected response:

```json
{
  "currency": "EGP",
  "totalSales": 5294.17,
  "totalTransactions": 31,
  "refundedTransactions": 0
}
```

If this call fails, the dashboard just shows "—" on the stat cards — it
doesn't block the table.

## Quick way to test without writing a backend yet

Already covered — `server/index.js` is a working mock backend. Nothing
extra to set up.

## Files

- `server/index.js` — the Express API (mock data + the two routes below)
- `src/App.jsx` — the whole dashboard UI (calendar, filters, table, pagination, loading/empty/error states)
- `src/api.js` — the only place the frontend talks to the network; change `VITE_API_BASE_URL` in `.env` to point elsewhere
- `vite.config.js` — dev proxy so `fetch('/api/...')` reaches the Express server without CORS pain

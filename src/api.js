// Thin API client. Point VITE_API_BASE_URL at your backend (see README.md
// for the exact request/response shape this dashboard expects).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, params = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }

  return res.json();
}

/**
 * Fetch a page of transactions.
 * See README.md "API contract" for the exact params/response shape.
 */
export function fetchTransactions(params) {
  return request("/transactions", params);
}

/** Fetch the three summary stat-card numbers for the current filters. */
export function fetchStats(params) {
  return request("/transactions/stats", params);
}

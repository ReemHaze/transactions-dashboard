import React, { useState, useEffect, useRef } from "react";
import {
  Headphones,
  Globe,
  Settings,
  Plus,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Wallet,
  Banknote,
  X,
  Table,
  RefreshCw,
} from "lucide-react";
import { fetchTransactions, fetchStats } from "./api.js";

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function sameDay(a, b) {
  return (
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtShort(d) {
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}
function isoDate(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD for the API
}
function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, date: new Date(year, month - 1, daysInPrevMonth - i), muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(year, month, d), muted: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const nd = new Date(last);
    nd.setDate(nd.getDate() + 1);
    cells.push({ day: nd.getDate(), date: nd, muted: true });
  }
  return cells;
}

const TODAY = new Date();

// ---------------------------------------------------------------------------
// Small reusable filter dropdown
// ---------------------------------------------------------------------------
function FilterDropdown({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex items-center gap-1.5 border border-gray-200 rounded-lg px-3.5 py-2 font-medium text-sm ${
          disabled ? "opacity-50 cursor-not-allowed text-gray-400" : "hover:bg-gray-50"
        }`}
      >
        <span className={disabled ? "text-gray-400" : ""}>{label}</span>{" "}
        <b className="font-bold">{value}</b>
        <ChevronDown size={14} strokeWidth={2.5} />
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-[calc(100%+6px)] left-0 bg-white border border-gray-200 rounded-lg shadow-xl z-40 min-w-[160px] p-1.5">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="px-3 py-2 rounded-md cursor-pointer font-medium text-sm hover:bg-gray-100"
              >
                {opt}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// "+" advanced filter: pick a field, type a value, Apply -> becomes a chip
// ---------------------------------------------------------------------------
function PlusFilter({ options, onApply, disabled }) {
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [value, setValue] = useState("");

  function close() {
    setOpen(false);
    setActiveField(null);
    setValue("");
  }

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-[38px] h-[38px] flex items-center justify-center border border-gray-200 rounded-lg ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
        }`}
      >
        <Plus size={16} strokeWidth={2.5} />
      </div>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute top-[calc(100%+6px)] left-0 flex z-40">
            {activeField && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-[230px] mr-2">
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`Search by ${activeField}`}
                  className="w-full border-[1.5px] border-[#b3bdf5] rounded-lg px-3 py-2 text-sm mb-2.5 outline-none focus:border-[#2454f0]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && value.trim()) {
                      onApply(activeField, value.trim());
                      close();
                    }
                  }}
                />
                <button
                  disabled={!value.trim()}
                  onClick={() => {
                    onApply(activeField, value.trim());
                    close();
                  }}
                  className={`w-full rounded-lg py-2 font-semibold text-sm text-white ${
                    value.trim() ? "bg-[#2454f0] hover:bg-[#1a3fd8]" : "bg-[#a9b8f5] cursor-not-allowed"
                  }`}
                >
                  Apply
                </button>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-lg shadow-xl min-w-[210px] p-2 h-fit">
              {options.map((opt) => (
                <div
                  key={opt}
                  onClick={() => setActiveField(opt)}
                  className={`px-3 py-2.5 rounded-md cursor-pointer font-bold text-[13.5px] hover:bg-gray-100 ${
                    activeField === opt ? "bg-gray-100" : ""
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range calendar dropdown
// ---------------------------------------------------------------------------
function DateRangePicker({ rangeStart, rangeEnd, presetLabel, onApply }) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(rangeStart);
  const [tempEnd, setTempEnd] = useState(rangeEnd);
  const [preset, setPreset] = useState(presetLabel);
  const [viewMonth, setViewMonth] = useState(
    new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  );

  useEffect(() => {
    if (open) {
      setTempStart(rangeStart);
      setTempEnd(rangeEnd);
      setPreset(presetLabel);
      setViewMonth(new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const presets = [
    { key: "today", label: "Today" },
    { key: "7", label: "Last 7 days" },
    { key: "30", label: "Last 30 days" },
    { key: "90", label: "Last 90 days" },
    { key: "365", label: "Last 365 days" },
    { key: "custom", label: "Custom" },
  ];

  function applyPreset(key) {
    setPreset(key);
    if (key === "custom") return;
    const end = new Date(TODAY);
    let start = new Date(TODAY);
    if (key === "today") {
      /* start === end === today */
    } else if (key === "7") start.setDate(end.getDate() - 6);
    else if (key === "30") start.setDate(end.getDate() - 29);
    else if (key === "90") start.setDate(end.getDate() - 89);
    else if (key === "365") start.setDate(end.getDate() - 364);
    setTempStart(start);
    setTempEnd(end);
    setViewMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  }

  function pickDay(d) {
    setPreset("custom");
    if (!tempStart || (tempStart && tempEnd && !sameDay(tempStart, tempEnd)) ||
        (tempStart && tempEnd && sameDay(tempStart, tempEnd) && d < tempStart)) {
      setTempStart(d);
      setTempEnd(d);
    } else if (d < tempStart) {
      setTempStart(d);
    } else {
      setTempEnd(d);
    }
  }

  function isToday(d) {
    return sameDay(d, TODAY);
  }

  function rowWithPillInfo(cells) {
    return cells.map((c, i) => {
      const s = tempStart, e = tempEnd;
      const inRange = s && e && c.date >= s && c.date <= e;
      const isStart = s && sameDay(c.date, s);
      const isEnd = e && sameDay(c.date, e);
      const prevInRange = i > 0 && s && e && cells[i - 1].date >= s && cells[i - 1].date <= e;
      const nextInRange = i < cells.length - 1 && s && e && cells[i + 1].date >= s && cells[i + 1].date <= e;
      return { ...c, inRange, isStart, isEnd, roundLeft: inRange && !prevInRange, roundRight: inRange && !nextInRange };
    });
  }

  function renderMonth() {
    const rawCells = buildMonthGrid(viewMonth);
    const rows = [];
    for (let i = 0; i < rawCells.length; i += 7) {
      rows.push(rowWithPillInfo(rawCells.slice(i, i + 7)));
    }

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4 font-bold text-base">
          <span
            className="cursor-pointer text-gray-500 p-1 select-none"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          >
            <ChevronLeft size={18} />
          </span>
          <span>{MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
          <span
            className="cursor-pointer text-gray-500 p-1 select-none"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          >
            <ChevronRight size={18} />
          </span>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DOW.map((d) => (
            <div key={d} className="text-gray-400 text-xs font-semibold text-center py-1">{d}</div>
          ))}
        </div>

        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 mb-1">
            {row.map((c, ci) => {
              const showCircle = !c.muted && (c.isStart || c.isEnd);
              const showPill = !c.muted && c.inRange && !showCircle;
              return (
                <div key={ci} className="relative flex items-center justify-center py-1.5">
                  {showPill && (
                    <span
                      className={`absolute inset-y-1 left-0 right-0 bg-gray-100 ${
                        c.roundLeft ? "rounded-l-full" : ""
                      } ${c.roundRight ? "rounded-r-full" : ""}`}
                    />
                  )}
                  <span
                    onClick={() => !c.muted && pickDay(c.date)}
                    className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer
                      ${c.muted ? "text-gray-300 cursor-default" : "text-gray-900"}
                      ${showCircle ? "bg-[#2454f0] text-white font-semibold" : ""}
                      ${!c.muted && !showCircle ? "hover:bg-gray-200" : ""}`}
                  >
                    {c.day}
                  </span>
                  {isToday(c.date) && !showCircle && (
                    <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#2454f0]" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border-[1.5px] border-[#b3bdf5] bg-white rounded-lg px-3.5 py-2 font-medium text-sm"
      >
        <Calendar size={16} className="text-gray-500" />
        <span>{presetLabel}, {fmtShort(rangeStart)} ~ {fmtShort(rangeEnd)}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-[calc(100%+8px)] right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-40 w-[560px] max-w-[90vw]">
            <div className="flex">
              <div className="w-[160px] py-4 pl-2 shrink-0">
                {presets.map((p) => (
                  <div
                    key={p.key}
                    onClick={() => applyPreset(p.key)}
                    className={`mx-2 mb-1 px-3 py-2.5 rounded-lg cursor-pointer font-medium text-[15px] ${
                      preset === p.key ? "bg-[#eef2ff] text-[#2454f0] font-semibold" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </div>
                ))}
              </div>
              <div className="p-5 flex-1 border-l border-gray-100">
                {renderMonth()}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button
                className="border border-gray-200 rounded-lg px-5 py-2 font-semibold text-sm hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="bg-[#2454f0] text-white rounded-lg px-6 py-2 font-semibold text-sm hover:bg-[#1a3fd8]"
                onClick={() => {
                  const label = presets.find((p) => p.key === preset)?.label || "Custom";
                  onApply(tempStart, tempEnd, label);
                  setOpen(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell renderers
// ---------------------------------------------------------------------------
function formatDateCreated(d) {
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes.toString().padStart(2, "0");
  return { date: `${day} ${month} ${year}`, time: `${hours}:${mm} ${ampm}` };
}

function DateCreatedCell({ date }) {
  const { date: dateStr, time } = formatDateCreated(date);
  return (
    <div>
      <div className="font-bold text-gray-900">{dateStr}</div>
      <div className="text-gray-400 mt-0.5">{time}</div>
    </div>
  );
}

function MethodCell({ paymentMethod, cardBrand, last4 }) {
  if (paymentMethod === "Wallet") {
    return (
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-[#eef2ff] text-[#2454f0] flex items-center justify-center">
          <Wallet size={14} />
        </span>
        <span>Wallet</span>
      </div>
    );
  }
  if (paymentMethod === "Cash") {
    return (
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center">
          <Banknote size={14} />
        </span>
        <span>Cash</span>
      </div>
    );
  }
  if (cardBrand === "visa") {
    return (
      <div className="flex items-center gap-2">
        <span className="italic font-extrabold text-[#1a1f71] border border-gray-200 rounded px-1.5 text-[11px] tracking-wide">
          VISA
        </span>
        <span>****{last4}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center">
        <span className="w-4 h-4 rounded-full inline-block" style={{ background: "#eb001b" }} />
        <span className="w-4 h-4 rounded-full inline-block -ml-1.5 opacity-85" style={{ background: "#f79e1b" }} />
      </span>
      <span>****{last4}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Success: "bg-[#e8f8f0] text-[#0f9d58]",
    Failed: "bg-[#fdecec] text-[#d93025]",
    Pending: "bg-[#fff8e1] text-[#b8860b]",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full font-bold text-[12.5px] ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// Concentric-ripple empty state, matching the real app.
function EmptyState({ title = "No transactions yet", subtitle }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-20">
      {[220, 180, 140, 100].map((size) => (
        <span
          key={size}
          className="absolute rounded-full border border-gray-100"
          style={{ width: size, height: size }}
        />
      ))}
      <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#2454f0] flex items-center justify-center mb-5">
        <Table size={22} className="text-white" />
      </div>
      <div className="relative z-10 font-bold text-lg text-gray-900">{title}</div>
      {subtitle && <div className="relative z-10 text-gray-400 text-sm mt-1">{subtitle}</div>}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-14 h-14 rounded-2xl bg-[#fdecec] flex items-center justify-center mb-5">
        <RefreshCw size={22} className="text-[#d93025]" />
      </div>
      <div className="font-bold text-lg text-gray-900">Couldn't reach the API</div>
      <div className="text-gray-400 text-sm mt-1 max-w-sm text-center">{message}</div>
      <button
        onClick={onRetry}
        className="mt-5 bg-[#2454f0] hover:bg-[#1a3fd8] text-white rounded-lg px-5 py-2 font-semibold text-sm"
      >
        Retry
      </button>
    </div>
  );
}

function SkeletonRows({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={i}>
          <td colSpan={9} className="px-4 py-3.5 border-b border-gray-100">
            <div className="h-5 rounded-md bg-gray-100 animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TransactionsDashboard() {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [testMode, setTestMode] = useState(false);
  const [showSizeOpen, setShowSizeOpen] = useState(false);

  const [currency, setCurrency] = useState("All");
  const [method, setMethod] = useState("All");
  const [type, setType] = useState("All");
  const [channel, setChannel] = useState("All");
  const [extraFilter, setExtraFilter] = useState(null); // { label, value }

  const [rangeStart, setRangeStart] = useState(new Date(2026, 7, 6));
  const [rangeEnd, setRangeEnd] = useState(new Date(2026, 8, 4));
  const [presetLabel, setPresetLabel] = useState("Last 30 days");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const tabs = [
    { key: "all", label: "All transactions" },
    { key: "success", label: "Success" },
    { key: "pending", label: "Pending" },
    { key: "declined", label: "Declined" },
  ];

  const plusOptions = [
    "Transaction ID", "Order ID", "Transfer ID", "Terminal ID",
    "Integration ID", "Merchant Order ID", "RRN", "Phone Number",
  ];

  // Build the query params sent to the API for the current view.
  function buildParams() {
    const params = {
      status: tab === "all" ? undefined : tab === "declined" ? "failed" : tab,
      currency: currency === "All" ? undefined : currency,
      method: method === "All" ? undefined : method,
      type: type === "All" ? undefined : type,
      channel: channel === "All" ? undefined : channel,
      dateStart: isoDate(rangeStart),
      dateEnd: isoDate(rangeEnd),
      page,
      pageSize,
    };
    if (extraFilter) {
      params.field = extraFilter.label;
      params.q = extraFilter.value;
    }
    return params;
  }

  const didMount = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = buildParams();

    fetchTransactions(params)
      .then((data) => {
        setRows((data.rows || []).map((r) => ({ ...r, createdAt: new Date(r.createdAt) })));
        setTotal(data.total ?? (data.rows || []).length);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "Something went wrong.");
      })
      .finally(() => setLoading(false));

    fetchStats({ dateStart: isoDate(rangeStart), dateEnd: isoDate(rangeEnd) })
      .then(setStats)
      .catch(() => {} /* stat-card failures shouldn't block the table */);

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, currency, method, type, channel, extraFilter, rangeStart, rangeEnd, page, pageSize, reloadKey]);

  // Any filter change resets to page 1.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, currency, method, type, channel, extraFilter, rangeStart, rangeEnd, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function resetFilters() {
    setCurrency("All");
    setMethod("All");
    setType("All");
    setChannel("All");
    setExtraFilter(null);
  }

  return (
    <div className="bg-white text-gray-900 font-sans text-sm min-h-screen">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
            <ChevronLeft size={14} />
          </div>
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-gray-500 to-gray-800 flex items-center justify-center text-white font-semibold text-[13px] shrink-0">
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-teal-400 rounded-t-full" />
            FC
          </div>
          <div className="font-bold text-[15px]">Fady Company</div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTestMode((t) => !t)}
            className={`relative w-9 h-5 rounded-full transition-colors ${testMode ? "bg-[#2454f0]" : "bg-gray-200"}`}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
              style={testMode ? { transform: "translateX(18px)" } : {}}
            />
          </button>
          <span className="text-gray-500 font-medium">Test mode</span>
          <Headphones size={20} className="text-gray-600 cursor-pointer" />
          <Globe size={20} className="text-gray-600 cursor-pointer" />
          <Settings size={20} className="text-gray-600 cursor-pointer" />
          <button className="bg-[#2454f0] hover:bg-[#1a3fd8] text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-1.5">
            <Plus size={16} strokeWidth={2.5} /> Create
          </button>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-6 py-7 pb-14">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <h1 className="text-[26px] font-extrabold m-0">Transactions</h1>
          <DateRangePicker
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            presetLabel={presetLabel}
            onApply={(s, e, label) => {
              setRangeStart(s);
              setRangeEnd(e);
              setPresetLabel(label);
            }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {tabs.map((t) => (
            <div
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 pt-2.5 font-semibold cursor-pointer border-b-2 ${
                tab === t.key ? "text-[#2454f0] border-[#2454f0]" : "text-gray-500 border-transparent"
              }`}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mb-5.5">
          <div className="border border-gray-200 rounded-[10px] p-5">
            <div className="text-gray-500 font-medium mb-2.5">Total sales</div>
            <div className="text-2xl font-extrabold mb-2.5">
              {stats ? `${stats.currency || "EGP"} ${Number(stats.totalSales).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            </div>
            <span className="inline-flex items-center gap-1 font-bold text-[13px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-500">
              vs Previous period
            </span>
          </div>
          <div className="border border-gray-200 rounded-[10px] p-5">
            <div className="text-gray-500 font-medium mb-2.5">Total transactions</div>
            <div className="text-2xl font-extrabold mb-2.5">{stats ? stats.totalTransactions : "—"}</div>
            <span className="inline-flex items-center gap-1 font-bold text-[13px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-500">
              vs Previous period
            </span>
          </div>
          <div className="border border-gray-200 rounded-[10px] p-5">
            <div className="text-gray-500 font-medium mb-2.5">Refunded transactions</div>
            <div className="text-2xl font-extrabold mb-2.5">{stats ? stats.refundedTransactions : "—"}</div>
            <span className="inline-flex items-center gap-1 font-bold text-[13px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-500">
              vs Previous period
            </span>
          </div>
        </div>

        {/* Panel */}
        <div className="border border-gray-200 rounded-[10px]">
          {/* Filters */}
          <div className="flex items-center gap-2.5 p-4 flex-wrap">
            <FilterDropdown label="Currency" value={currency} options={["All", "EGP", "USD", "SAR"]} onChange={setCurrency} disabled={loading} />
            <FilterDropdown label="Method" value={method} options={["All", "Card", "Wallet", "Cash"]} onChange={setMethod} disabled={loading} />
            <FilterDropdown label="Type" value={type} options={["All", "Authorize", "Capture", "Refund"]} onChange={setType} disabled={loading} />
            <FilterDropdown label="Channel" value={channel} options={["All", "Online", "POS", "App"]} onChange={setChannel} disabled={loading} />

            {extraFilter && (
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3.5 py-2 font-medium">
                <span className="text-gray-500">{extraFilter.label}</span>
                <b className="font-bold">{extraFilter.value}</b>
                <X
                  size={15}
                  className="text-gray-400 cursor-pointer hover:text-gray-600 ml-1"
                  onClick={() => setExtraFilter(null)}
                />
              </div>
            )}

            <PlusFilter options={plusOptions} onApply={(label, value) => setExtraFilter({ label, value })} disabled={loading} />

            <span
              onClick={resetFilters}
              className="text-[#2454f0] font-bold cursor-pointer flex items-center gap-1.5 ml-0.5"
            >
              <RotateCcw size={15} /> Reset filters
            </span>
          </div>

          {/* Table / states */}
          {error ? (
            <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : !loading && rows.length === 0 ? (
            <EmptyState subtitle="Try adjusting your filters or date range." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Amount", "Status", "Method", "Customer", "Trnx ID", "Type", "Order ID", "Date Created", "Source"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 font-semibold border-t border-b border-gray-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonRows />
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3.5 border-b border-gray-200 font-bold">
                          {r.currency} {Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200">
                          <MethodCell paymentMethod={r.paymentMethod} cardBrand={r.cardBrand} last4={r.last4} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200">
                          <div className="font-bold">{r.customer}</div>
                          <div className="text-gray-500 text-[12.5px] mt-0.5">{r.sub}</div>
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200">{r.trnx}</td>
                        <td className="px-4 py-3.5 border-b border-gray-200">{r.type}</td>
                        <td className="px-4 py-3.5 border-b border-gray-200">{r.order}</td>
                        <td className="px-4 py-3.5 border-b border-gray-200 whitespace-nowrap">
                          <DateCreatedCell date={r.createdAt} />
                        </td>
                        <td className="px-4 py-3.5 border-b border-gray-200 font-semibold">{r.channel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!error && (
            <div className="flex items-center justify-between flex-wrap gap-3 p-4">
              <div className="relative">
                <div
                  onClick={() => setShowSizeOpen((o) => !o)}
                  className="border border-gray-200 rounded-lg px-3.5 py-2 flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  Show <b className="font-bold">{pageSize}</b>
                  <ChevronDown size={14} strokeWidth={2.5} />
                </div>
                {showSizeOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowSizeOpen(false)} />
                    <div className="absolute bottom-[calc(100%+6px)] left-0 bg-white border border-gray-200 rounded-lg shadow-xl z-40 min-w-[100px] p-1.5">
                      {[10, 25, 50, 100].map((n) => (
                        <div
                          key={n}
                          onClick={() => {
                            setPageSize(n);
                            setShowSizeOpen(false);
                          }}
                          className="px-3 py-2 rounded-md cursor-pointer font-medium hover:bg-gray-100"
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div
                  onClick={() => page > 1 && setPage(page - 1)}
                  className={`border border-gray-200 rounded-lg px-3.5 py-2 flex items-center gap-1.5 font-semibold cursor-pointer text-gray-500 ${
                    page === 1 ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} /> Previous
                </div>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <div
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer font-semibold ${
                      p === page ? "bg-[#eef2ff] text-[#2454f0]" : ""
                    }`}
                  >
                    {p}
                  </div>
                ))}
                <div
                  onClick={() => page < totalPages && setPage(page + 1)}
                  className={`border border-gray-200 rounded-lg px-3.5 py-2 flex items-center gap-1.5 font-semibold cursor-pointer text-gray-500 ${
                    page === totalPages ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  Next <ChevronRight size={14} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

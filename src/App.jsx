import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./index.css";

// ---------- Utility helpers (local date safe) ----------
const pad = (n) => String(n).padStart(2, "0");
const toLocalISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseISO = (iso) => {
  if (!iso) return null;
  const [y,m,dd] = iso.split("-").map(Number);
  if (!y || !m || !dd) return null;
  const d = new Date(y, m - 1, dd);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== dd) return null;
  return d;
};
const addDaysLocal = (iso, n) => {
  const d = parseISO(iso);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};
const todayLocalISO = () => toLocalISO(new Date());
const firstOfMonth = (ym) => { const [y,m]=ym.split('-').map(Number); return toLocalISO(new Date(y, m-1, 1)); };
const lastOfMonth = (ym) => { const [y,m]=ym.split('-').map(Number); return toLocalISO(new Date(y, m, 0)); };
const ym = (iso) => (iso ? iso.slice(0,7) : "");
const fmtPct = (n) => `${Math.round((n||0)*100)}%`;

// ---------- CSV helpers ----------
const escapeCSV = (s) => {
  if (s === null || s === undefined) return "";
  const str = String(s);
  const needsQuotes = /[",\n\r]/.test(str);
  const escaped = str.replaceAll('"','""');
  return needsQuotes ? `"${escaped}"` : escaped;
};
const toCSV = (rows) => {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")].concat(
    rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(","))
  );
  return lines.join("\n");
};
// Robust CSV parser supporting quoted commas and multi-line fields
const parseCSVText = (text) => {
  if (!text) return [];
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const pushCell = () => { row.push(cell); cell = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  const s = text.replace(/\r/g, "");
  for (let i=0; i<s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i+1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') pushCell();
      else if (ch === '\n') { pushCell(); pushRow(); }
      else cell += ch;
    }
  }
  if (cell.length || row.length) { pushCell(); pushRow(); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  const out = [];
  for (let r=1; r<rows.length; r++) {
    if (rows[r].length === 1 && rows[r][0] === "") continue;
    const o = {};
    headers.forEach((h, i) => { o[h] = rows[r][i] ?? ""; });
    out.push(o);
  }
  return out;
};
const fromCSVFile = async (file) => parseCSVText(await file.text());

// ---------- Local storage ----------
const LS_KEY = "kpi_retention_v3";
const useLocalState = (key, initial) => {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  }, [key, state]);
  return [state, setState];
};

// ---------- Master data model ----------
const newDriver = () => ({
  id: crypto.randomUUID(),
  name: "",
  recruiter: "",
  source: "",
  startDate: "",
  week1Note: "",
  week2Note: "",
  week3Note: "",
  week4Note: "",
  hiringCost: "",
  timeToHireDays: "",
  orientationDate: "",
  passedOrientation: "",
  passed90Days: "",
  status: "Active",
  termDate: "",
  termReason: "",
  archived: false,
  archivedAt: ""
});

const RECRUITERS = ["Emily","Victoria","Zoe","Melissa","Camilla"];
const SOURCES = ["Facebook","Referral","Agent"];

// ---------- Reusable UI ----------
const Bar = ({ pct }) => {
  const v = Math.max(0, Math.min(1, pct||0));
  return (
    <div className="h-2 w-40 bg-slate-200 rounded-full overflow-hidden" aria-label={`Completion ${Math.round(v*100)}%`}>
      <div className="h-full" style={{width:`${v*100}%`, background: v===1?"#16a34a": v>=0.5?"#f59e0b":"#ef4444"}}></div>
    </div>
  );
};
const Metric = ({ label, value }) => (
  <div className="px-3 py-2 rounded-xl bg-white border">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-base font-semibold">{value}</div>
  </div>
);
const Select = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={(e)=>onChange(e.target.value)} className="px-2 py-1 border rounded-lg">
    <option value="">{placeholder||"—"}</option>
    {options.map(o=> <option key={o} value={o}>{o}</option>)}
  </select>
);

// ---------- App shell ----------
function AppShell({ children, current, setCurrent }) {
  const tabs = ["Dashboard","Recruitment","Follow-Ups","Termination","KPI","Settings"];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">KPI & Driver Retention</h1>
          <div className="text-slate-500">Local mode • All data saved in your browser</div>
        </header>
        <nav className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t} onClick={() => setCurrent(t)} className={`btn px-3 py-2 rounded-2xl border ${current === t ? "bg-black text-white" : "bg-white"}`}>{t}</button>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
function FiltersBar({ filters, setFilters, savedViews, setSavedViews }) {
  const update = (patch) => setFilters({ ...filters, ...patch });

  const quickRange = (key) => {
    const today = parseISO(todayLocalISO());
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = firstOfMonth(ym(todayLocalISO()));
    if (key === "week") update({ from: toLocalISO(startOfWeek), to: todayLocalISO() });
    if (key === "month") update({ from: startOfMonth, to: todayLocalISO() });
    if (key === "clear") update({ from: "", to: "" });
  };

  const saveView = () => {
    const name = prompt("Name this view"); if (!name) return;
    const copy = { ...(savedViews || {}) };
    copy[name] = { ...filters, view: name };
    setSavedViews(copy);
    setFilters({ ...filters, view: name });
  };
  const loadView = (name) => {
    if (!name) return;
    const conf = savedViews?.[name];
    if (conf) setFilters({ ...conf, view: name });
  };

  return (
    <div className="bg-white rounded-2xl p-3 border shadow-sm flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <input type="date" value={filters.from || ""} onChange={(e) => update({ from: e.target.value })} className="px-2 py-1 border rounded-lg" />
        <span>→</span>
        <input type="date" value={filters.to || ""} onChange={(e) => update({ to: e.target.value })} className="px-2 py-1 border rounded-lg" />
        <button onClick={() => quickRange("week")} className="btn px-2 py-1 rounded-lg border bg-white">This week</button>
        <button onClick={() => quickRange("month")} className="btn px-2 py-1 rounded-lg border bg-white">This month</button>
        <button onClick={() => quickRange("clear")} className="btn px-2 py-1 rounded-lg border bg-white">Clear</button>
      </div>

      <div className="flex items-center gap-2 ml-2">
        <select value={filters.recruiter || ""} onChange={(e) => update({ recruiter: e.target.value })} className="px-2 py-1 border rounded-lg">
          <option value="">All recruiters</option>
          {RECRUITERS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.source || ""} onChange={(e) => update({ source: e.target.value })} className="px-2 py-1 border rounded-lg">
          <option value="">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <select value={filters.view || ""} onChange={(e) => loadView(e.target.value)} className="px-2 py-1 border rounded-lg">
          <option value="">Load view…</option>
          {Object.keys(savedViews||{}).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={saveView} className="btn px-3 py-2 rounded-xl border bg-white">Save view</button>
      </div>
    </div>
  );
}

function SimpleLineChart({ points, height = 140 }) {
  const padding = 24;
  const w = Math.max(300, points.length * 40);
  const h = height;
  const ys = points.map((p) => p.v);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const scaleX = (i) => padding + (i * (w - padding * 2)) / Math.max(points.length - 1, 1);
  const scaleY = (v) => h - padding - ((v - minY) * (h - padding * 2)) / Math.max(maxY - minY || 1, 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(p.v)}`).join(" ");
  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="bg-white rounded-xl border">
        <path d={d} fill="none" stroke="#0ea5e9" strokeWidth="2" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(p.v)} r="3" fill="#0ea5e9" />
            <text x={scaleX(i)} y={h - 6} fontSize="10" textAnchor="middle" fill="#64748b">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Dashboard({ drivers, monthly, range, setRange }) {
  const rangeWindows = { "1m": 1, "3m": 3, "6m": 6, "12m": 12, "all": Infinity };
  const windowSize = rangeWindows[range] ?? Infinity;
  const sliced = windowSize === Infinity ? monthly : monthly.slice(-windowSize);

  const headStart = sliced.map(r => ({ label: r.month.slice(5), v: r.hcStart }));
  const headEnd = sliced.map(r => ({ label: r.month.slice(5), v: r.hcEnd }));
  const retention = sliced.map(r => ({ label: r.month.slice(5), v: Math.round(r.retentionPct * 100) / 100 }));

  const active = drivers.filter(d => !d.archived).length;
  const mtdMonth = ym(todayLocalISO());
  const newHiresMTD = drivers.filter(d => ym(d.startDate) === mtdMonth).length;
  const leaversMTD = drivers.filter(d => d.status === "Terminated" && ym(d.termDate) === mtdMonth).length;
  const retentionMTD = (() => {
    const row = monthly.find(r => r.month === mtdMonth);
    return row ? fmtPct(row.retentionPct) : "—";
  })();

  const byRecruiter = {};
  drivers.forEach(d => {
    if (d.archived) return;
    const key = d.recruiter || "(Unassigned)";
    byRecruiter[key] ||= { count: 0, sum: 0 };
    byRecruiter[key].count++;
    const completed = ["week1Note","week2Note","week3Note","week4Note"].filter(k => (d[k]||"").trim()!=="").length/4;
    byRecruiter[key].sum += completed;
  });
  const leaderboard = Object.entries(byRecruiter).map(([recruiter, v]) => ({
    recruiter, drivers: v.count, completion: v.sum/(v.count||1)
  })).sort((a,b)=>b.completion-a.completion);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-lg">Dashboard</h2>
        <div className="flex items-center gap-2">
      {["1m","3m","6m","12m","all"].map(k => (
        <button
          key={k}
          onClick={() => setRange(k)}
          className={`btn px-2 py-1 rounded-lg border ${range === k ? "bg-black text-white" : "bg-white"}`}
        >
          {k === "all" ? "All" : k}
        </button>
      ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border">
        <h2 className="font-semibold mb-2">Recruiter Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">Recruiter</th>
                <th className="py-2">Drivers</th>
                <th className="py-2">Avg Completion</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(r => (
                <tr key={r.recruiter} className="border-t">
                  <td className="py-2">{r.recruiter}</td>
                  <td className="py-2">{r.drivers}</td>
                  <td className="py-2">{fmtPct(r.completion)}</td>
                  <td className="py-2"><Bar pct={r.completion} /></td>
                </tr>
              ))}
              {!leaderboard.length && (<tr><td colSpan={4} className="py-6 text-center text-slate-400">No data yet.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Active drivers" value={active} />
        <Metric label="New hires (MTD)" value={newHiresMTD} />
        <Metric label="Leavers (MTD)" value={leaversMTD} />
        <Metric label="Retention (MTD)" value={retentionMTD} />
      </div>

      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <div className="font-semibold mb-2">Headcount Start (range)</div>
        <SimpleLineChart points={headStart} />
      </div>
      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <div className="font-semibold mb-2">Headcount End (range)</div>
        <SimpleLineChart points={headEnd} />
      </div>
      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <div className="font-semibold mb-2">Retention % (range)</div>
        <SimpleLineChart points={retention} />
      </div>
    </section>
  );
}

function KPI({ monthly }){
  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm border">
      <h2 className="font-semibold mb-2">Monthly KPI — Retention (Formula B)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">Month</th>
              <th className="py-2">Headcount Start</th>
              <th className="py-2">Headcount End</th>
              <th className="py-2">Avg Headcount</th>
              <th className="py-2">Leavers</th>
              <th className="py-2">Retention %</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map(r=> (
              <tr key={r.month} className="border-t">
                <td className="py-2">{r.month}</td>
                <td className="py-2">{r.hcStart}</td>
                <td className="py-2">{r.hcEnd}</td>
                <td className="py-2">{(Math.round(r.avgHC*10)/10).toFixed(1)}</td>
                <td className="py-2">{r.leavers}</td>
                <td className="py-2">{fmtPct(r.retentionPct)}</td>
              </tr>
            ))}
            {!monthly.length && (<tr><td colSpan={6} className="py-6 text-center text-slate-400">No monthly data yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function FollowUps({ drivers, can, up, addDriver, archive, unarchive, completion, filters, setFilters, savedViews, setSavedViews }) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const markDoneAllowed = (dueISO) => !dueISO || parseISO(dueISO) <= parseISO(todayLocalISO());

  const overdue = (dueISO, note) => {
    if (!dueISO || (note||"").trim()) return false;
    return parseISO(dueISO) < parseISO(todayLocalISO());
  };
  const dueSoon = (dueISO, note) => {
    if (!dueISO || (note||"").trim()) return false;
    const today = parseISO(todayLocalISO());
    const due = parseISO(dueISO);
    const soon = new Date(today); soon.setDate(soon.getDate()+2);
    return (due >= today && due <= soon);
  };

  const DueCell = ({ due, note }) => {
    const cls = overdue(due,note) ? "bg-red-100 text-red-700" : dueSoon(due,note) ? "bg-yellow-100 text-yellow-700" : "";
    return <div className={`px-2 py-1 rounded-lg ${cls}`}>{due || "—"}</div>;
  };

  return (
    <section className="space-y-3">
      <FiltersBar filters={filters} setFilters={setFilters} savedViews={savedViews} setSavedViews={setSavedViews} />

      <div className="bg-white rounded-2xl p-3 border shadow-sm flex flex-wrap items-center gap-2">
        <button onClick={addDriver} className="btn ml-auto px-3 py-2 rounded-xl bg-black text-white">+ Driver</button>
      </div>

      <div className="bg-white rounded-2xl p-0 border shadow-sm overflow-x-auto">
        <table className="min-w-[1220px] text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="py-2 px-2">Driver</th>
              <th className="py-2 px-2">Recruiter</th>
              <th className="py-2 px-2">Source</th>
              <th className="py-2 px-2">Start</th>
              <th className="py-2 px-2">W1 Due</th>
              <th className="py-2 px-2">W1 Note</th>
              <th className="py-2 px-2">W2 Due</th>
              <th className="py-2 px-2">W2 Note</th>
              <th className="py-2 px-2">W3 Due</th>
              <th className="py-2 px-2">W3 Note</th>
              <th className="py-2 px-2">W4 Due</th>
              <th className="py-2 px-2">W4 Note</th>
              <th className="py-2 px-2">Completion</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">More</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => {
              const due = ({
                w1: d.startDate ? addDaysLocal(d.startDate, 7) : "",
                w2: d.startDate ? addDaysLocal(d.startDate, 14) : "",
                w3: d.startDate ? addDaysLocal(d.startDate, 21) : "",
                w4: d.startDate ? addDaysLocal(d.startDate, 28) : "",
              });
              const comp = completion(d);
              return (
                <tr key={d.id} className={`border-t ${d.archived ? "opacity-60" : ""}`}>
                  <td className="py-2 px-2">
                    <input value={d.name} onChange={(e) => up(d.id, { name: e.target.value })} placeholder="Driver name" className="px-2 py-1 border rounded-lg w-40" />
                  </td>
                  <td className="py-2 px-2">
                    <select value={d.recruiter} onChange={(e) => up(d.id, { recruiter: e.target.value })} className="px-2 py-1 border rounded-lg w-36"><option value="">—</option>{RECRUITERS.map(r => <option key={r}>{r}</option>)}</select>
                  </td>
                  <td className="py-2 px-2">
                    <select value={d.source} onChange={(e) => up(d.id, { source: e.target.value })} className="px-2 py-1 border rounded-lg w-36"><option value="">—</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
                  </td>
                  <td className="py-2 px-2"><input type="date" value={d.startDate} onChange={(e) => up(d.id, { startDate: e.target.value })} className="px-2 py-1 border rounded-lg w-36" /></td>

                  <td className="py-2 px-2"><DueCell due={due.w1} note={d.week1Note} /></td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <textarea value={d.week1Note} onChange={(e) => up(d.id, { week1Note: e.target.value })} placeholder="Week 1 note" className="px-2 py-1 border rounded-lg w-48 h-10" />
                      <button disabled={!can.markWeek() || !markDoneAllowed(due.w1)} onClick={() => up(d.id, { week1Note: d.week1Note || "-" })} className={`btn px-2 py-1 rounded-lg border ${markDoneAllowed(due.w1) ? "bg-white" : "bg-slate-100 text-slate-400"}`}>Mark</button>
                    </div>
                  </td>

                  <td className="py-2 px-2"><DueCell due={due.w2} note={d.week2Note} /></td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <textarea value={d.week2Note} onChange={(e) => up(d.id, { week2Note: e.target.value })} placeholder="Week 2 note" className="px-2 py-1 border rounded-lg w-48 h-10" />
                      <button disabled={!can.markWeek() || !markDoneAllowed(due.w2)} onClick={() => up(d.id, { week2Note: d.week2Note || "-" })} className={`btn px-2 py-1 rounded-lg border ${markDoneAllowed(due.w2) ? "bg-white" : "bg-slate-100 text-slate-400"}`}>Mark</button>
                    </div>
                  </td>

                  <td className="py-2 px-2"><DueCell due={due.w3} note={d.week3Note} /></td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <textarea value={d.week3Note} onChange={(e) => up(d.id, { week3Note: e.target.value })} placeholder="Week 3 note" className="px-2 py-1 border rounded-lg w-48 h-10" />
                      <button disabled={!can.markWeek() || !markDoneAllowed(due.w3)} onClick={() => up(d.id, { week3Note: d.week3Note || "-" })} className={`btn px-2 py-1 rounded-lg border ${markDoneAllowed(due.w3) ? "bg-white" : "bg-slate-100 text-slate-400"}`}>Mark</button>
                    </div>
                  </td>

                  <td className="py-2 px-2"><DueCell due={due.w4} note={d.week4Note} /></td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <textarea value={d.week4Note} onChange={(e) => up(d.id, { week4Note: e.target.value })} placeholder="Week 4 note" className="px-2 py-1 border rounded-lg w-48 h-10" />
                      <button disabled={!can.markWeek() || !markDoneAllowed(due.w4)} onClick={() => up(d.id, { week4Note: d.week4Note || "-" })} className={`btn px-2 py-1 rounded-lg border ${markDoneAllowed(due.w4) ? "bg-white" : "bg-slate-100 text-slate-400"}`}>Mark</button>
                    </div>
                  </td>

                  <td className="py-2 px-2 whitespace-nowrap">{fmtPct(comp)}</td>
                  <td className="py-2 px-2"><div className="w-40"><Bar pct={comp} /></div></td>

                  <td className="py-2 px-2 relative">
                    <button onClick={() => setMenuOpenId(menuOpenId === d.id ? null : d.id)} className="btn px-2 py-1 rounded-lg border bg-white">More ▾</button>
                    {menuOpenId === d.id && (
                      <div className="absolute right-2 mt-1 bg-white border rounded-xl shadow-lg z-10 w-44">
                        {!d.archived && <button disabled={!can.archive} onClick={() => { setMenuOpenId(null); if (confirm(`Archive ${d.name || "this driver"}?`)) archive([d.id]); }} className="btn w-full text-left px-3 py-2 hover:bg-slate-50 disabled:text-slate-400">Archive…</button>}
                        {d.archived && <button disabled={!can.unarchive} onClick={() => { setMenuOpenId(null); unarchive([d.id]); }} className="btn w-full text-left px-3 py-2 hover:bg-slate-50 disabled:text-slate-400">Unarchive</button>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!drivers.length && (<tr><td className="py-6 text-center text-slate-400" colSpan={15}>No rows. Use filters or add a driver.</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Recruitment({ drivers, up, addDriver }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Recruitment</h2>
        <button onClick={addDriver} className="btn px-3 py-2 rounded-xl bg-black text-white">+ Driver</button>
      </div>

      <div className="bg-white rounded-2xl p-0 border shadow-sm overflow-x-auto">
        <table className="min-w-[1100px] text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="py-2 px-2">Driver</th>
              <th className="py-2 px-2">Recruiter</th>
              <th className="py-2 px-2">Source</th>
              <th className="py-2 px-2">Hired (Start)</th>
              <th className="py-2 px-2">Cost</th>
              <th className="py-2 px-2">Time-to-Hire (d)</th>
              <th className="py-2 px-2">Orientation</th>
              <th className="py-2 px-2">Passed Orient</th>
              <th className="py-2 px-2">Passed 90d</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="py-2 px-2"><input value={d.name} onChange={(e) => up(d.id, { name: e.target.value })} placeholder="Driver" className="px-2 py-1 border rounded-lg w-40" /></td>
                <td className="py-2 px-2"><select value={d.recruiter} onChange={(e) => up(d.id, { recruiter: e.target.value })} className="px-2 py-1 border rounded-lg w-36"><option value="">—</option>{RECRUITERS.map(r => <option key={r}>{r}</option>)}</select></td>
                <td className="py-2 px-2"><select value={d.source} onChange={(e) => up(d.id, { source: e.target.value })} className="px-2 py-1 border rounded-lg w-36"><option value="">—</option>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></td>
                <td className="py-2 px-2"><input type="date" value={d.startDate} onChange={(e) => up(d.id, { startDate: e.target.value })} className="px-2 py-1 border rounded-lg w-40" /></td>
                <td className="py-2 px-2"><input type="number" value={d.hiringCost} onChange={(e) => up(d.id, { hiringCost: e.target.value })} placeholder="USD" className="px-2 py-1 border rounded-lg w-28" /></td>
                <td className="py-2 px-2"><input type="number" value={d.timeToHireDays} onChange={(e) => up(d.id, { timeToHireDays: e.target.value })} placeholder="days" className="px-2 py-1 border rounded-lg w-28" /></td>
                <td className="py-2 px-2"><input type="date" value={d.orientationDate} onChange={(e) => up(d.id, { orientationDate: e.target.value })} className="px-2 py-1 border rounded-lg w-40" /></td>
                <td className="py-2 px-2"><select value={d.passedOrientation} onChange={(e) => up(d.id, { passedOrientation: e.target.value })} className="px-2 py-1 border rounded-lg w-28"><option value="">—</option><option>Y</option><option>N</option></select></td>
                <td className="py-2 px-2"><select value={d.passed90Days} onChange={(e) => up(d.id, { passed90Days: e.target.value })} className="px-2 py-1 border rounded-lg w-28"><option value="">—</option><option>Y</option><option>N</option></select></td>
              </tr>
            ))}
            {!drivers.length && (<tr><td colSpan={9} className="py-6 text-center text-slate-400">Add drivers to track recruitment KPIs.</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Termination({ drivers, up, can }) {
  const active = drivers.filter(d => d.status !== "Terminated");
  const leavers = drivers.filter(d => d.status === "Terminated");

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Active</h2></div>
        <div className="overflow-x-auto mt-2">
          <table className="min-w-[900px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="py-2 px-2">Driver</th>
                <th className="py-2 px-2">Recruiter</th>
                <th className="py-2 px-2">Start</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Terminate Date</th>
                <th className="py-2 px-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {active.map(d => {
                const needsDate = (d.status === "Terminated" && !d.termDate);
                return (
                  <tr key={d.id} className="border-t">
                    <td className="py-2 px-2">{d.name || "—"}</td>
                    <td className="py-2 px-2">{d.recruiter || "—"}</td>
                    <td className="py-2 px-2">{d.startDate || "—"}</td>
                    <td className="py-2 px-2">
                      <select
                        value={d.status}
                        onChange={(e) => {
                          if (!can.setTermination) return;
                          const status = e.target.value;
                          up(
                            d.id,
                            status === "Active"
                              ? { status, termDate: "", termReason: "" }
                              : { status }
                          );
                        }}
                        className="px-2 py-1 border rounded-lg w-32"
                        disabled={!can.setTermination}
                      >
                        <option>Active</option>
                        <option>Terminated</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        value={d.termDate}
                        onChange={(e) => {
                          if (!can.setTermination) return;
                          const value = e.target.value;
                          // Require users to manually choose a termination date
                          // without auto-filling today's date.
                          up(d.id, { termDate: value });
                        }}
                        className={`px-2 py-1 border rounded-lg w-40 ${needsDate ? "border-red-500" : ""}`}
                        disabled={!can.setTermination || d.status !== "Terminated"}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={d.termReason}
                        onChange={(e) => {
                          if (!can.setTermination) return;
                          up(d.id, { termReason: e.target.value });
                        }}
                        placeholder="Reason"
                        className="px-2 py-1 border rounded-lg w-60"
                        disabled={!can.setTermination || d.status !== "Terminated"}
                      />
                    </td>
                  </tr>
                );
              })}
              {!active.length && (<tr><td colSpan={6} className="py-4 text-slate-400">No active drivers.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <h3 className="font-semibold mb-2">Leavers</h3>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="py-2 px-2">Driver</th>
                <th className="py-2 px-2">Recruiter</th>
                <th className="py-2 px-2">Start</th>
                <th className="py-2 px-2">Term Date</th>
                <th className="py-2 px-2">Reason</th>
                <th className="py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leavers.map(d => (
                <tr key={d.id} className="border-t">
                  <td className="py-2 px-2">{d.name}</td>
                  <td className="py-2 px-2">{d.recruiter || "—"}</td>
                  <td className="py-2 px-2">{d.startDate || "—"}</td>
                  <td className="py-2 px-2">{d.termDate || "—"}</td>
                  <td className="py-2 px-2">
                    <input
                      value={d.termReason}
                      onChange={(e) => {
                        if (!can.setTermination) return;
                        up(d.id, { termReason: e.target.value });
                      }}
                      placeholder="Reason"
                      className="px-2 py-1 border rounded-lg w-60"
                      disabled={!can.setTermination}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => {
                        if (!can.setTermination) return;
                        up(d.id, { status: "Active", termDate: "", termReason: "" });
                      }}
                      className="btn px-2 py-1 border rounded-lg bg-white"
                      disabled={!can.setTermination}
                    >
                      Reactivate
                    </button>
                  </td>
                </tr>
              ))}
              {!leavers.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-slate-400">
                    No leavers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
function Settings({ drivers, setDrivers, sheetUrl, setSheetUrl, onSyncNow, autoSyncEnabled, setAutoSyncEnabled }) {
  const [preview, setPreview] = useState(null);
  const [map, setMap] = useState({});
  const FIELDS = [
    { key: "name", label: "Driver Name" }, { key: "recruiter", label: "Recruiter" }, { key: "source", label: "Source" },
    { key: "startDate", label: "Start Date (yyyy-mm-dd)" }, { key: "week1Note", label: "Week1 Note" },
    { key: "week2Note", label: "Week2 Note" }, { key: "week3Note", label: "Week3 Note" }, { key: "week4Note", label: "Week4 Note" },
    { key: "hiringCost", label: "Hiring Cost" }, { key: "timeToHireDays", label: "Time to Hire (d)" },
    { key: "orientationDate", label: "Orientation Date" }, { key: "passedOrientation", label: "Passed Orientation (Y/N)" },
    { key: "passed90Days", label: "Passed 90d (Y/N)" }, { key: "status", label: "Status (Active/Terminated)" },
    { key: "termDate", label: "Termination Date" }, { key: "termReason", label: "Termination Reason" }
  ];

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await fromCSVFile(file);
    if (!rows.length) { setPreview(null); return; }
    setPreview({ headers: Object.keys(rows[0]), rows });
    const mm = {}; FIELDS.forEach(f => { if (rows[0][f.key] !== undefined) mm[f.key] = f.key; });
    setMap(mm); e.target.value = "";
  };

  const applyImport = () => {
    if (!preview) return;
    const mapped = preview.rows.map((r) => {
      const d = newDriver();
      Object.entries(map).forEach(([field, header]) => {
        const value = r[header];
        if (field === "id") {
          if (value) d.id = value; // only overwrite id if provided
        } else {
          d[field] = value ?? d[field];
        }
      });
      return d;
    });
    setDrivers((prev) => {
      const byId = Object.fromEntries(prev.map((d) => [d.id, d]));
      mapped.forEach((d) => {
        if (d.id && byId[d.id]) byId[d.id] = { ...byId[d.id], ...d };
        else byId[d.id] = d;
      });
      return Object.values(byId);
    });
    setPreview(null); setMap({});
  };

  const exportCSV = () => {
    const csv = toCSV(
      drivers.map(({ id, ...rest }) => {
        void id;
        return rest;
      })
    );
    if (!csv) { alert("No data to export"); return; }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drivers_${todayLocalISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const wipe = () => {
    if (!confirm("This will clear ALL driver data. Continue?")) return;
    setDrivers([]);
    localStorage.removeItem(LS_KEY + ":drivers");
  };

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3">
        <h2 className="font-semibold">Google Sheet Sync</h2>
        <div className="flex flex-wrap items-end gap-2">
          <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0" className="px-3 py-2 rounded-xl border w-[520px]" />
          <button onClick={onSyncNow} className="btn px-3 py-2 rounded-xl border bg-white">Sync now</button>
          <label className="text-sm flex items-center gap-2 ml-2">
            <input type="checkbox" checked={autoSyncEnabled} onChange={(e) => setAutoSyncEnabled(e.target.checked)} />
            Auto-sync every 1 hour
          </label>
        </div>
        <div className="text-xs text-slate-500">Use a published CSV URL. Headers should match the app’s field names.</div>
      </div>

      <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3">
        <h2 className="font-semibold">Import / Export</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="btn px-3 py-2 rounded-xl bg-white border cursor-pointer">Import CSV<input type="file" accept=".csv" className="hidden" onChange={onFile} /></label>
          <button onClick={applyImport} disabled={!preview} className={`btn px-3 py-2 rounded-xl border ${preview ? "bg-black text-white" : "bg-white text-slate-400"}`}>Apply Mapping</button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportCSV} className="btn px-3 py-2 rounded-xl bg-white border">Export CSV</button>
            <button onClick={wipe} className="btn px-3 py-2 rounded-xl bg-red-600 text-white">Clear ALL data</button>
          </div>
        </div>
        {preview && (
          <div className="bg-slate-50 border rounded-2xl p-3">
            <div className="font-semibold mb-2">Map columns</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <div className="w-48 text-sm">{f.label}</div>
                  <select value={map[f.key] || ""} onChange={(e) => setMap({ ...map, [f.key]: e.target.value })} className="px-2 py-1 border rounded-lg flex-1">
                    <option value="">—</option>
                    {preview.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-2">CSV supports multi-line quoted fields. Unmapped fields will use defaults.</div>
          </div>
        )}
      </div>

      <TestsPanel />
    </section>
  );
}

function TestsPanel(){
  const [results, setResults] = useState([]);
  const run = () => {
    const res = [];
    const assert = (name, cond) => res.push({ name, pass: !!cond });

    const csv1 = "a,b\n1,2\n3,4\n";
    const r1 = parseCSVText(csv1); assert("LF newline split", r1.length===2 && r1[0].a==="1" && r1[1].b==="4");
    const csv2 = "a,b\r\n1,2\r\n3,4\r\n";
    const r2 = parseCSVText(csv2); assert("CRLF newline split", r2.length===2 && r2[1].b==="4");
    const csv3 = "name,company\nJohn,\"Acme, Inc.\"\n";
    const r3 = parseCSVText(csv3); assert("Quoted comma", r3[0].company==="Acme, Inc.");
    const csv4 = "name,note\nJohn,\"Line1\nLine2\"\n";
    const r4 = parseCSVText(csv4); assert("Multiline field", r4.length===1 && r4[0].note==="Line1\nLine2");

    setResults(res);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={run} className="btn px-3 py-2 rounded-xl bg-white border">Run tests</button>
        <span className="text-slate-500 text-sm">(CSV parsing checks)</span>
      </div>
      {!!results.length && (
        <ul className="space-y-1 text-sm">
          {results.map((r,i)=>(
            <li key={i} className={r.pass?"text-green-700":"text-red-700"}>{r.pass?"✅":"❌"} {r.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default function App() {
  const [drivers, setDrivers] = useLocalState(LS_KEY + ":drivers", []);
  const [tab, setTab] = useState("Dashboard");
  const [filters, setFilters] = useLocalState(LS_KEY + ":filters", { from: "", to: "", recruiter: "", source: "", view: "" });
  const [savedViews, setSavedViews] = useLocalState(LS_KEY + ":views", {});
  const [range, setRange] = useLocalState(LS_KEY + ":range", "3m");
  const [sheetUrl, setSheetUrl] = useLocalState(LS_KEY + ":sheetUrl", "");
  const [autoSyncEnabled, setAutoSyncEnabled] = useLocalState(LS_KEY + ":autoSync", true);

  const can = {
    archive: true,
    unarchive: true,
    setTermination: true,
    markWeek: () => true
  };

  const up = (id, patch) => setDrivers(arr => arr.map(d => d.id === id ? { ...d, ...patch } : d));
  const addDriver = () => setDrivers(arr => [{ ...newDriver() }, ...arr]);
  const archive = (ids) => setDrivers(arr => arr.map(d => ids.includes(d.id) ? { ...d, archived: true, archivedAt: todayLocalISO() } : d));
  const unarchive = (ids) => setDrivers(arr => arr.map(d => ids.includes(d.id) ? { ...d, archived: false } : d));

  const completion = (d) => (["week1Note","week2Note","week3Note","week4Note"].filter(k => (d[k]||"").trim()!=="").length)/4;

  const months = useMemo(() => {
    const s = new Set();
    drivers.forEach(d => { if (d.startDate) s.add(ym(d.startDate)); if (d.termDate) s.add(ym(d.termDate)); });
    return Array.from(s).filter(Boolean).sort();
  }, [drivers]);

  const monthly = useMemo(() => {
    const headcountOn = (isoDate) =>
      drivers.filter(d => {
        if (!d.startDate) return false;
        const sd = parseISO(d.startDate);
        const date = parseISO(isoDate);
        if (sd > date) return false;
        if (d.status === "Terminated" && d.termDate) return parseISO(d.termDate) > date;
        return true;
      }).length;

    const leaversInMonth = (ymonth) =>
      drivers.filter(d => d.status === "Terminated" && d.termDate && ym(d.termDate) === ymonth).length;

    return months.map(m => {
      const start = firstOfMonth(m);
      const end = lastOfMonth(m);
      const hcStart = headcountOn(start);
      const hcEnd = headcountOn(end);
      const avgHC = (hcStart + hcEnd) / 2;
      const leavers = leaversInMonth(m);
      const retentionPct = avgHC ? 1 - leavers / avgHC : 0;
      return { month: m, hcStart, hcEnd, avgHC, leavers, retentionPct };
    });
  }, [months, drivers]);

  const applySheetRows = useCallback((rows) => {
    const mapped = rows.map((r) => {
      const d = newDriver();
      Object.keys(d).forEach((k) => {
        if (r[k] !== undefined && (k !== "id" || r[k])) d[k] = r[k];
      });
      return d;
    });
    setDrivers((prev) => {
      const byId = Object.fromEntries(prev.map((d) => [d.id, d]));
      mapped.forEach((d) => {
        if (d.id && byId[d.id]) byId[d.id] = { ...byId[d.id], ...d };
        else byId[d.id] = d;
      });
      return Object.values(byId);
    });
  }, [setDrivers]);

  const syncNow = useCallback(async () => {
    try {
      if (!sheetUrl.trim()) {
        alert("Add your Google Sheet CSV URL in Settings.");
        return;
      }
      const res = await fetch(sheetUrl.trim(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseCSVText(text);
      if (!rows.length) {
        alert("The sheet is empty or headers are missing.");
        return;
      }
      applySheetRows(rows);
      alert("Sync complete.");
    } catch (e) {
      alert("Sync failed. Check the URL and sharing settings.\n\n" + e.message);
    }
  }, [sheetUrl, applySheetRows]);

  useEffect(() => {
    if (!autoSyncEnabled || !sheetUrl) return;
    const id = setInterval(() => {
      syncNow();
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoSyncEnabled, sheetUrl, syncNow]);

  const filteredDrivers = useMemo(() => {
    const arr = drivers.filter(d => !d.archived);
    const within = (date) => {
      if (!filters.from && !filters.to) return true;
      if (!date) return false;
      const dt = parseISO(date);
      if (filters.from && dt < parseISO(filters.from)) return false;
      if (filters.to && dt > parseISO(filters.to)) return false;
      return true;
    };
    return arr.filter(d => {
      if (filters.recruiter && d.recruiter !== filters.recruiter) return false;
      if (filters.source && d.source !== filters.source) return false;
      if (!within(d.startDate)) return false;
      return true;
    });
  }, [drivers, filters]);

  return (
    <AppShell current={tab} setCurrent={setTab}>
      {tab === "Dashboard" && (
        <Dashboard drivers={drivers} monthly={monthly} range={range} setRange={setRange} />
      )}
      {tab === "Follow-Ups" && (
        <FollowUps
          drivers={filteredDrivers}
          can={can}
          up={up}
          addDriver={addDriver}
          archive={archive}
          unarchive={unarchive}
          completion={completion}
          filters={filters}
          setFilters={setFilters}
          savedViews={savedViews}
          setSavedViews={setSavedViews}
        />
      )}
      {tab === "Recruitment" && (
        <Recruitment drivers={filteredDrivers} up={up} addDriver={addDriver} />
      )}
      {tab === "Termination" && <Termination drivers={filteredDrivers} up={up} can={can} />}
      {tab === "KPI" && <KPI monthly={monthly} />}
      {tab === "Settings" && (
        <Settings
          drivers={drivers}
          setDrivers={setDrivers}
          sheetUrl={sheetUrl}
          setSheetUrl={setSheetUrl}
          onSyncNow={syncNow}
          autoSyncEnabled={autoSyncEnabled}
          setAutoSyncEnabled={setAutoSyncEnabled}
        />
      )}
    </AppShell>
  );
}

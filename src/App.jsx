import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./index.css";
import AppShell from "./components/AppShell";
import DriversTable from "./components/DriversTable";
import Termination from "./components/Termination";
import Settings from "./components/Settings";
import { toLocalISO, parseISO, addDaysLocal, todayLocalISO, firstOfMonth, lastOfMonth, ym, fmtPct } from "./lib/date";
import { LS_KEY, useLocalState } from "./lib/storage";

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
        <DriversTable
          drivers={filteredDrivers}
          up={up}
          addDriver={addDriver}
          recruiters={RECRUITERS}
          sources={SOURCES}
        />
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
          newDriver={newDriver}
          fromCSVFile={fromCSVFile}
          toCSV={toCSV}
        />
      )}
    </AppShell>
  );
}

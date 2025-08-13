import React, { useMemo, useState, useEffect } from "react";

const pad = (n) => String(n).padStart(2, "0");
const toLocalISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso) => { if (!iso) return null; const [y, m, dd] = iso.split("-").map(Number); if (!y || !m || !dd) return null; return new Date(y, m - 1, dd); };
const addDaysLocal = (iso, n) => { const d = parseISO(iso); if (!d) return ""; d.setDate(d.getDate() + n); return toLocalISO(d); };
const todayLocalISO = () => toLocalISO(new Date());
const firstOfMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return toLocalISO(new Date(y, m - 1, 1)); };
const lastOfMonth = (ym) => { const [y, m] = ym.split("-").map(Number); return toLocalISO(new Date(y, m, 0)); };
const ym = (iso) => (iso ? iso.slice(0, 7) : "");
const fmtPct = (n) => `${Math.round((n || 0) * 100)}%`;

const escapeCSV = (s) => { if (s === null || s === undefined) return ""; const str = String(s); const needs = /[",\n\r]/.test(str); const esc = str.replace(/"/g, '""'); return needs ? `"` + esc + `"` : esc; };
const toCSV = (rows) => { if (!rows?.length) return ""; const headers = Object.keys(rows[0]); const lines = [headers.join(",")].concat(rows.map(r => headers.map(h => escapeCSV(r[h])).join(","))); return lines.join("\n"); };
const parseCSVText = (text) => {
  if (!text) return [];
  const rows = []; let row = []; let cell = ""; let inQ = false;
  const pushCell = () => { row.push(cell); cell = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  const s = text.replace(/\r/g, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else { inQ = false; } }
      else { cell += ch; }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") pushCell();
      else if (ch === "\n") { pushCell(); pushRow(); }
      else cell += ch;
    }
  }
  if (cell.length || row.length) { pushCell(); pushRow(); }
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length === 1 && rows[r][0] === "") continue;
    const o = {}; headers.forEach((h, i) => { o[h] = rows[r][i] ?? ""; }); out.push(o);
  }
  return out;
};
const fromCSVFile = async (file) => parseCSVText(await file.text());

const LS_KEY = "kpi_retention_v3";
const useLocalState = (key, initial) => {
  const [state, setState] = useState(() => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; } });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);
  return [state, setState];
};

const newDriver = () => ({ id: crypto.randomUUID(), archived: false, name: "", recruiter: "", source: "", startDate: "", week1Note: "", week2Note: "", week3Note: "", week4Note: "", hiringCost: "", timeToHireDays: "", orientationDate: "", passedOrientation: "", passed90Days: "", status: "Active", termDate: "", termReason: "" });

const RECRUITERS = ["Emily", "Victoria", "Zoe", "Melissa", "Camilla"];
const SOURCES = ["Facebook", "Referral", "Agent"];

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [drivers, setDrivers] = useLocalState(LS_KEY + ":drivers", []);
  const [history, setHistory] = useLocalState(LS_KEY + ":history", []);
  const [filters, setFilters] = useLocalState(LS_KEY + ":filters", { recruiter: "", source: "", status: "", overdueOnly: false, showArchived: false });
  const [savedViews, setSavedViews] = useLocalState(LS_KEY + ":views", {});

  const pushHistory = (next) => { setHistory((h) => ([...(h || []), drivers])); setDrivers(next); };
  const undo = () => { setHistory((h) => { if (!h?.length) return h; const prev = h[h.length - 1]; setDrivers(prev); return h.slice(0, -1); }); };

  const up = (id, patch) => pushHistory(drivers.map(d => d.id === id ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) } : d));
  const addDriver = () => pushHistory([{ ...newDriver() }, ...drivers]);
  const del = (id) => pushHistory(drivers.filter(d => d.id !== id));
  const archive = (ids) => pushHistory(drivers.map(d => ids.includes(d.id) ? { ...d, archived: true } : d));
  const bulkSetRecruiter = (ids, val) => pushHistory(drivers.map(d => ids.includes(d.id) ? { ...d, recruiter: val } : d));
  const bulkSetSource = (ids, val) => pushHistory(drivers.map(d => ids.includes(d.id) ? { ...d, source: val } : d));
  const bulkMarkWeek = (ids, week) => pushHistory(drivers.map(d => ids.includes(d.id) ? { ...d, [week]: d[week] || "-" } : d));

  const completion = (d) => ([d.week1Note, d.week2Note, d.week3Note, d.week4Note].filter(x => (x ?? "").trim() !== "").length) / 4;

  const calcDue = (d) => ({ w1: d.startDate ? addDaysLocal(d.startDate, 7) : "", w2: d.startDate ? addDaysLocal(d.startDate, 14) : "", w3: d.startDate ? addDaysLocal(d.startDate, 21) : "", w4: d.startDate ? addDaysLocal(d.startDate, 28) : "" });
  const isOverdue = (dueISO, note) => { if (!dueISO || (note || "").trim()) return false; return parseISO(dueISO) < parseISO(todayLocalISO()); };

  const validated = (d) => {
    const errs = [];
    if (!d.name) errs.push("Name");
    if (!d.recruiter) errs.push("Recruiter");
    if (!d.source) errs.push("Source");
    if (d.startDate && parseISO(d.startDate) > parseISO(todayLocalISO())) errs.push("Start>");
    if (d.status === "Terminated" && !d.termDate) errs.push("TermDate");
    return errs;
  };

  const months = useMemo(() => { const s = new Set(); drivers.forEach(d => { if (d.startDate) s.add(ym(d.startDate)); if (d.termDate) s.add(ym(d.termDate)); }); return Array.from(s).filter(Boolean).sort(); }, [drivers]);
  const headcountOn = (iso) => drivers.filter(d => { if (d.archived) return false; const sd = parseISO(d.startDate); if (!sd) return false; const date = parseISO(iso); if (sd > date) return false; if (d.status === "Terminated" && d.termDate) { return parseISO(d.termDate) > date; } return true; }).length;
  const leaversInMonth = (m) => drivers.filter(d => !d.archived && d.status === "Terminated" && d.termDate && ym(d.termDate) === m).length;
  const monthly = useMemo(() => months.map(m => { const start = firstOfMonth(m); const end = lastOfMonth(m); const hcStart = headcountOn(start); const hcEnd = headcountOn(end); const avgHC = (hcStart + hcEnd) / 2; const leavers = leaversInMonth(m); const retentionPct = avgHC ? (1 - (leavers / avgHC)) : 0; return { month: m, hcStart, hcEnd, avgHC, leavers, retentionPct }; }), [months, drivers]);

  const overdueByRecruiter = useMemo(() => {
    const map = {};
    drivers.forEach(d => {
      if (d.archived) return;
      const r = d.recruiter || "(Unassigned)"; const due = calcDue(d);
      const over = [isOverdue(due.w1, d.week1Note), isOverdue(due.w2, d.week2Note), isOverdue(due.w3, d.week3Note), isOverdue(due.w4, d.week4Note)].filter(Boolean).length;
      if (!map[r]) map[r] = 0; map[r] += over;
    });
    return map;
  }, [drivers]);

  const applyFilters = (arr) => arr.filter(d => {
    if (!filters.showArchived && d.archived) return false;
    if (filters.recruiter && d.recruiter !== filters.recruiter) return false;
    if (filters.source && d.source !== filters.source) return false;
    if (filters.status && d.status !== filters.status) return false;
    if (filters.overdueOnly) { const due = calcDue(d); if (!(isOverdue(due.w1, d.week1Note) || isOverdue(due.w2, d.week2Note) || isOverdue(due.w3, d.week3Note) || isOverdue(due.w4, d.week4Note))) return false; }
    return true;
  });

  const saveView = (name) => { if (!name.trim()) return; const v = { ...filters }; setSavedViews({ ...savedViews, [name]: v }); };
  const applyView = (name) => { const v = savedViews[name]; if (!v) return; setFilters(v); };
  const deleteView = (name) => { const copy = { ...savedViews }; delete copy[name]; setSavedViews(copy); };

  const [bulk, setBulk] = useState({ selected: {}, recruiter: "", source: "" });
  const idsSelected = Object.keys(bulk.selected).filter(id => bulk.selected[id]);
  const allInFiltered = (rows) => { const ids = rows.map(r => r.id); const all = ids.every(id => bulk.selected[id]); const some = !all && ids.some(id => bulk.selected[id]); return { all, some, ids }; };

  const filteredDrivers = applyFilters(drivers);

  const exportCSV = () => {
    const rows = filteredDrivers.map(({ archived, id, ...rest }) => rest);
    const csv = toCSV(rows);
    if (!csv) { alert("No data to export"); return; }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drivers_${todayLocalISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Topbar tab={tab} setTab={setTab} exportCSV={exportCSV} undo={undo} />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {tab === "Dashboard" && (<Dashboard monthly={monthly} drivers={drivers} completion={(d) => completion(d)} overdueByRecruiter={overdueByRecruiter} />)}
        {tab === "Follow-Ups" && (
          <FollowUps
            drivers={filteredDrivers}
            allState={allInFiltered(filteredDrivers)}
            setAll={(check) => { const next = { ...bulk.selected }; filteredDrivers.forEach(d => { next[d.id] = check; }); setBulk({ ...bulk, selected: next }); }}
            bulk={bulk} setBulk={setBulk}
            up={up} addDriver={addDriver} del={del} archive={archive}
            bulkMarkWeek={bulkMarkWeek} bulkSetRecruiter={bulkSetRecruiter} bulkSetSource={bulkSetSource}
            completion={completion} filters={filters} setFilters={setFilters}
            saveView={saveView} applyView={applyView} deleteView={deleteView} savedViews={savedViews}
          />
        )}
        {tab === "Recruitment" && (<Recruitment drivers={filteredDrivers} up={up} addDriver={addDriver} del={del} archive={archive} validated={validated} />)}
        {tab === "Termination" && (<Termination drivers={filteredDrivers} up={up} del={del} archive={archive} validated={validated} />)}
        {tab === "KPI" && (<KPI monthly={monthly} drivers={drivers} />)}
        {tab === "Settings/Import" && (<Settings drivers={drivers} setDrivers={setDrivers} pushHistory={pushHistory} savedViews={savedViews} setSavedViews={setSavedViews} />)}
      </div>
    </div>
  );
}
function Topbar({ tab, setTab, exportCSV, undo }) {
  const tabs = ["Dashboard", "Follow-Ups", "Recruitment", "Termination", "KPI", "Settings/Import"];
  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-xl border ${tab === t ? "bg-black text-white" : "bg-white hover:bg-slate-50"}`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} className="px-3 py-2 rounded-xl border bg-white">Undo</button>
          <button onClick={exportCSV} className="px-3 py-2 rounded-xl border bg-black text-white">Export CSV</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function Bar({ pct }) {
  const v = Math.max(0, Math.min(1, pct || 0));
  return (
    <div className="h-2 w-40 bg-slate-200 rounded-full overflow-hidden" aria-label={`Completion ${Math.round(v * 100)}%`}>
      <div className="h-full" style={{ width: `${v * 100}%`, background: v === 1 ? "#16a34a" : v >= 0.5 ? "#f59e0b" : "#ef4444" }}></div>
    </div>
  );
}

function Dashboard({ monthly, drivers, completion, overdueByRecruiter }) {
  const active = drivers.filter(d => !d.archived).length;
  const avgCompletion = active ? drivers.filter(d => !d.archived).reduce((s, d) => s + completion(d), 0) / active : 0;

  const byRecruiter = {};
  drivers.forEach(d => { if (d.archived) return; const r = d.recruiter || "(Unassigned)"; byRecruiter[r] ||= { count: 0, sum: 0 }; byRecruiter[r].count += 1; byRecruiter[r].sum += completion(d); });
  const leaderboard = Object.entries(byRecruiter).map(([recruiter, v]) => ({ recruiter, drivers: v.count, completion: v.sum / (v.count || 1) })).sort((a, b) => b.completion - a.completion);

  return (
    <section className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Drivers (All)" value={active} />
        <Stat label="Avg Completion" value={fmtPct(avgCompletion)} />
        <Stat label="Months Tracked" value={monthly.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Recruiter Leaderboard</h2></div>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-slate-500"><th className="py-2">Recruiter</th><th className="py-2">Drivers</th><th className="py-2">Avg Completion</th><th className="py-2">Status</th></tr></thead>
              <tbody>
                {leaderboard.map(r => (
                  <tr key={r.recruiter} className="border-t"><td className="py-2">{r.recruiter}</td><td className="py-2">{r.drivers}</td><td className="py-2">{fmtPct(r.completion)}</td><td className="py-2"><Bar pct={r.completion} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <h2 className="font-semibold">Overdue Follow-Ups by Recruiter</h2>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(overdueByRecruiter).map(([r, c]) => (
              <div key={r} className="px-3 py-2 rounded-xl border bg-slate-50 flex items-center justify-between">
                <span>{r}</span>
                <span className={`text-sm px-2 py-1 rounded-full ${c ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <h2 className="font-semibold mb-2">Monthly Retention (Formula B)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Month</th><th className="py-2">Headcount Start</th><th className="py-2">Headcount End</th><th className="py-2">Avg Headcount</th><th className="py-2">Leavers</th><th className="py-2">Retention %</th></tr></thead>
            <tbody>
              {monthly.map(r => (
                <tr key={r.month} className="border-t"><td className="py-2">{r.month}</td><td className="py-2">{r.hcStart}</td><td className="py-2">{r.hcEnd}</td><td className="py-2">{(Math.round(r.avgHC * 10) / 10).toFixed(1)}</td><td className="py-2">{r.leavers}</td><td className="py-2">{fmtPct(r.retentionPct)}</td></tr>
              ))}
              {!monthly.length && (<tr><td colSpan={6} className="py-6 text-center text-slate-400">No monthly data yet.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
function FiltersBar({ filters, setFilters, saveView, applyView, deleteView, savedViews }) {
  const [viewName, setViewName] = useState("");
  return (
    <div className="bg-white p-3 rounded-2xl border shadow-sm flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">Recruiter</label>
        <select value={filters.recruiter} onChange={(e) => setFilters({ ...filters, recruiter: e.target.value })} className="px-2 py-1 border rounded-lg w-40">
          <option value="">All</option>
          {RECRUITERS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">Source</label>
        <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className="px-2 py-1 border rounded-lg w-40">
          <option value="">All</option>
          {SOURCES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">Status</label>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-2 py-1 border rounded-lg w-40">
          <option value="">All</option>
          <option>Active</option>
          <option>Terminated</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.overdueOnly} onChange={(e) => setFilters({ ...filters, overdueOnly: e.target.checked })} /> Overdue only</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.showArchived} onChange={(e) => setFilters({ ...filters, showArchived: e.target.checked })} /> Show archived</label>

      <div className="ml-auto flex items-end gap-2">
        <select value={""} onChange={(e) => { if (e.target.value) applyView(e.target.value); }} className="px-2 py-1 border rounded-lg w-48">
          <option value="">Saved views…</option>
          {Object.keys(savedViews).map(n => (<option key={n} value={n}>{n}</option>))}
        </select>
        <input placeholder="Name this view" value={viewName} onChange={(e) => setViewName(e.target.value)} className="px-2 py-1 border rounded-lg w-40" />
        <button onClick={() => { saveView(viewName); setViewName(""); }} className="px-3 py-2 rounded-xl border bg-white">Save</button>
        <button onClick={() => { if (!Object.keys(savedViews).length) return; const n = prompt("Delete which view?", Object.keys(savedViews)[0]); if (n) deleteView(n); }} className="px-3 py-2 rounded-xl border bg-white">Delete</button>
      </div>
    </div>
  );
}

function FollowUps({
  drivers, allState, setAll, bulk, setBulk, up, addDriver, del, archive,
  bulkMarkWeek, bulkSetRecruiter, bulkSetSource, completion,
  filters, setFilters, saveView, applyView, deleteView, savedViews
}) {
  const toggle = (id) => setBulk({ ...bulk, selected: { ...bulk.selected, [id]: !bulk.selected[id] } });
  const { all, some, ids } = allState;

  return (
    <section className="space-y-3">
      <FiltersBar filters={filters} setFilters={setFilters} saveView={saveView} applyView={applyView} deleteView={deleteView} savedViews={savedViews} />

      <div className="bg-white rounded-2xl p-3 border shadow-sm flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={all} ref={(el) => { if (el) el.indeterminate = some; }} onChange={(e) => setAll(e.target.checked)} /> Select all in view
        </label>

        <select value={bulk.recruiter} onChange={(e) => setBulk({ ...bulk, recruiter: e.target.value })} className="px-2 py-1 border rounded-lg">
          <option value="">Set recruiter…</option>
          {RECRUITERS.map(r => <option key={r}>{r}</option>)}
        </select>
        <button onClick={() => { if (!ids.length || !bulk.recruiter) return; bulkSetRecruiter(ids, bulk.recruiter); }} className="px-3 py-2 rounded-xl border bg-white">Apply</button>

        <select value={bulk.source} onChange={(e) => setBulk({ ...bulk, source: e.target.value })} className="px-2 py-1 border rounded-lg">
          <option value="">Set source…</option>
          {SOURCES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => { if (!ids.length || !bulk.source) return; bulkSetSource(ids, bulk.source); }} className="px-3 py-2 rounded-xl border bg-white">Apply</button>

        <div className="h-6 w-px bg-slate-200" />

        {(["week1Note", "week2Note", "week3Note", "week4Note"]).map((w, i) => (
          <button key={w} onClick={() => { if (!ids.length) return; bulkMarkWeek(ids, w); }} className="px-3 py-2 rounded-xl border bg-white">Mark W{i + 1} done</button>
        ))}

        <div className="h-6 w-px bg-slate-200" />

        <button onClick={() => { if (!ids.length) return; archive(ids); }} className="px-3 py-2 rounded-xl border bg-white">Archive</button>
        <button onClick={addDriver} className="ml-auto px-3 py-2 rounded-xl bg-black text-white">+ Driver</button>
      </div>

      <div className="bg-white rounded-2xl p-0 border shadow-sm overflow-x-auto">
        <table className="min-w-[1200px] text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="py-2 px-2"><input type="checkbox" checked={all} ref={(el) => { if (el) el.indeterminate = some; }} onChange={(e) => setAll(e.target.checked)} /></th>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => {
              const due = ({ w1: d.startDate ? addDaysLocal(d.startDate, 7) : "", w2: d.startDate ? addDaysLocal(d.startDate, 14) : "", w3: d.startDate ? addDaysLocal(d.startDate, 21) : "", w4: d.startDate ? addDaysLocal(d.startDate, 28) : "" });
              const comp = completion(d);
              const errs = ((dd) => {
                const e = [];
                if (!dd.name) e.push("name");
                if (!dd.recruiter) e.push("recruiter");
                if (!dd.source) e.push("source");
                if (dd.status === "Terminated" && !dd.termDate) e.push("termDate");
                return e;
              })(d);
              const badge = (dueISO, note) => {
                if (!dueISO || (note || "").trim()) return "";
                const t = parseISO(todayLocalISO()); const dd = parseISO(dueISO); const soon = new Date(t); soon.setDate(soon.getDate() + 2);
                if (dd < t) return "bg-red-100 text-red-700";
                if (dd >= t && dd <= soon) return "bg-yellow-100 text-yellow-700";
                return "";
              };
              return (
                <tr key={d.id} className={`border-t ${errs.length ? "bg-red-50/30" : ""}`}>
                  <td className="py-2 px-2"><input type="checkbox" checked={!!bulk.selected[d.id]} onChange={() => toggle(d.id)} /></td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <input value={d.name} onChange={(e) => up(d.id, { name: e.target.value })} placeholder="Driver name" className="px-2 py-1 border rounded-lg w-40" />
                      {errs.length > 0 && <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Fix</span>}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <select value={d.recruiter} onChange={(e) => up(d.id, { recruiter: e.target.value })} className="px-2 py-1 border rounded-lg w-36">
                      <option value="">—</option>{RECRUITERS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <select value={d.source} onChange={(e) => up(d.id, { source: e.target.value })} className="px-2 py-1 border rounded-lg w-36">
                      <option value="">—</option>{SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2"><input type="date" value={d.startDate} onChange={(e) => up(d.id, { startDate: e.target.value })} className="px-2 py-1 border rounded-lg w-36" /></td>
                  <td className="py-2 px-2"><div className={`px-2 py-1 rounded-lg ${badge(due.w1, d.week1Note)}`}>{due.w1 || "—"}</div></td>
                  <td className="py-2 px-2"><textarea value={d.week1Note} onChange={(e) => up(d.id, { week1Note: e.target.value })} placeholder="Week 1 note or '-'" className="px-2 py-1 border rounded-lg w-48 h-10" /></td>
                  <td className="py-2 px-2"><div className={`px-2 py-1 rounded-lg ${badge(due.w2, d.week2Note)}`}>{due.w2 || "—"}</div></td>
                  <td className="py-2 px-2"><textarea value={d.week2Note} onChange={(e) => up(d.id, { week2Note: e.target.value })} placeholder="Week 2 note or '-'" className="px-2 py-1 border rounded-lg w-48 h-10" /></td>
                  <td className="py-2 px-2"><div className={`px-2 py-1 rounded-lg ${badge(due.w3, d.week3Note)}`}>{due.w3 || "—"}</div></td>
                  <td className="py-2 px-2"><textarea value={d.week3Note} onChange={(e) => up(d.id, { week3Note: e.target.value })} placeholder="Week 3 note or '-'" className="px-2 py-1 border rounded-lg w-48 h-10" /></td>
                  <td className="py-2 px-2"><div className={`px-2 py-1 rounded-lg ${badge(due.w4, d.week4Note)}`}>{due.w4 || "—"}</div></td>
                  <td className="py-2 px-2"><textarea value={d.week4Note} onChange={(e) => up(d.id, { week4Note: e.target.value })} placeholder="Week 4 note or '-'" className="px-2 py-1 border rounded-lg w-48 h-10" /></td>
                  <td className="py-2 px-2 whitespace-nowrap">{fmtPct(comp)}</td>
                  <td className="py-2 px-2"><div className="w-40"><Bar pct={comp} /></div></td>
                  <td className="py-2 px-2">
                    <div className="flex gap-2">
                      <button onClick={() => archive([d.id])} className="text-slate-600 hover:underline">Archive</button>
                      <button onClick={() => del(d.id)} className="text-red-600 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!drivers.length && (
              <tr><td className="py-6 text-center text-slate-400" colSpan={16}>No rows. Use filters or add a driver.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Recruitment({ drivers, up, addDriver, del, archive, validated }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Recruitment</h2>
        <button onClick={addDriver} className="px-3 py-2 rounded-xl bg-black text-white">+ Driver</button>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="py-2 px-2"><input value={d.name} onChange={(e) => up(d.id, { name: e.target.value })} placeholder="Driver" className="px-2 py-1 border rounded-lg w-40" /></td>
                <td className="py-2 px-2">
                  <select value={d.recruiter} onChange={(e) => up(d.id, { recruiter: e.target.value })} className="px-2 py-1 border rounded-lg w-36">
                    <option value="">—</option>{RECRUITERS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <select value={d.source} onChange={(e) => up(d.id, { source: e.target.value })} className="px-2 py-1 border rounded-lg w-36">
                    <option value="">—</option>{SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="py-2 px-2"><input type="date" value={d.startDate} onChange={(e) => up(d.id, { startDate: e.target.value })} className="px-2 py-1 border rounded-lg w-40" /></td>
                <td className="py-2 px-2"><input type="number" value={d.hiringCost} onChange={(e) => up(d.id, { hiringCost: e.target.value })} placeholder="USD" className="px-2 py-1 border rounded-lg w-28" /></td>
                <td className="py-2 px-2"><input type="number" value={d.timeToHireDays} onChange={(e) => up(d.id, { timeToHireDays: e.target.value })} placeholder="days" className="px-2 py-1 border rounded-lg w-28" /></td>
                <td className="py-2 px-2"><input type="date" value={d.orientationDate} onChange={(e) => up(d.id, { orientationDate: e.target.value })} className="px-2 py-1 border rounded-lg w-40" /></td>
                <td className="py-2 px-2">
                  <select value={d.passedOrientation} onChange={(e) => up(d.id, { passedOrientation: e.target.value })} className="px-2 py-1 border rounded-lg w-28">
                    <option value="">—</option><option>Y</option><option>N</option>
                  </select>
                </td>
                <td className="py-2 px-2">
                  <select value={d.passed90Days} onChange={(e) => up(d.id, { passed90Days: e.target.value })} className="px-2 py-1 border rounded-lg w-28">
                    <option value="">—</option><option>Y</option><option>N</option>
                  </select>
                </td>
                <td className="py-2 px-2">
                  <div className="flex gap-2">
                    <button onClick={() => archive([d.id])} className="text-slate-600 hover:underline">Archive</button>
                    <button onClick={() => del(d.id)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!drivers.length && (<tr><td colSpan={10} className="py-6 text-center text-slate-400">Add drivers to track recruitment KPIs.</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Termination({ drivers, up, del, archive, validated }) {
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
                <th></th>
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
                      <select value={d.status} onChange={(e) => up(d.id, { status: e.target.value })} className="px-2 py-1 border rounded-lg w-32">
                        <option>Active</option><option>Terminated</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input type="date" value={d.termDate} onChange={(e) => up(d.id, { termDate: e.target.value })} className={`px-2 py-1 border rounded-lg w-40 ${needsDate ? "border-red-500" : ""}`} />
                    </td>
                    <td className="py-2 px-2"><input value={d.termReason} onChange={(e) => up(d.id, { termReason: e.target.value })} placeholder="Reason" className="px-2 py-1 border rounded-lg w-60" /></td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button onClick={() => archive([d.id])} className="text-slate-600 hover:underline">Archive</button>
                        <button onClick={() => del(d.id)} className="text-red-600 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!active.length && (<tr><td colSpan={7} className="py-4 text-slate-400">No active drivers.</td></tr>)}
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leavers.map(d => (
                <tr key={d.id} className="border-t">
                  <td className="py-2 px-2">{d.name}</td>
                  <td className="py-2 px-2">{d.recruiter || "—"}</td>
                  <td className="py-2 px-2">{d.startDate || "—"}</td>
                  <td className="py-2 px-2">{d.termDate || "—"}</td>
                  <td className="py-2 px-2">{d.termReason || "—"}</td>
                  <td className="py-2 px-2"><button onClick={() => up(d.id, { status: "Active", termDate: "", termReason: "" })} className="px-2 py-1 rounded-lg border">Reinstate</button></td>
                </tr>
              ))}
              {!leavers.length && (<tr><td colSpan={6} className="py-4 text-slate-400">No leavers yet.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function KPI({ monthly, drivers }) {
  const byRecruiter = {};
  const bySource = {};
  drivers.forEach(d => { if (d.archived) return; const r = d.recruiter || "(Unassigned)"; const s = d.source || "(Unknown)"; byRecruiter[r] = (byRecruiter[r] || 0) + 1; bySource[s] = (bySource[s] || 0) + 1; });

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <h2 className="font-semibold mb-2">Monthly KPI — Retention (Formula B)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th className="py-2">Month</th><th className="py-2">Headcount Start</th><th className="py-2">Headcount End</th><th className="py-2">Avg Headcount</th><th className="py-2">Leavers</th><th className="py-2">Retention %</th></tr></thead>
            <tbody>
              {monthly.map(r => (<tr key={r.month} className="border-t"><td className="py-2">{r.month}</td><td className="py-2">{r.hcStart}</td><td className="py-2">{r.hcEnd}</td><td className="py-2">{(Math.round(r.avgHC * 10) / 10).toFixed(1)}</td><td className="py-2">{r.leavers}</td><td className="py-2">{fmtPct(r.retentionPct)}</td></tr>))}
              {!monthly.length && (<tr><td colSpan={6} className="py-6 text-center text-slate-400">No monthly data yet.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <h2 className="font-semibold mb-2">Drivers by Recruiter</h2>
          <div className="space-y-2">
            {Object.entries(byRecruiter).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2 rounded-xl border bg-slate-50">
                <span>{k}</span><span className="text-sm px-2 py-1 rounded-full bg-slate-200">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <h2 className="font-semibold mb-2">Drivers by Source</h2>
          <div className="space-y-2">
            {Object.entries(bySource).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2 rounded-xl border bg-slate-50">
                <span>{k}</span><span className="text-sm px-2 py-1 rounded-full bg-slate-200">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
function Settings({ drivers, setDrivers, pushHistory, savedViews, setSavedViews }) {
  const [preview, setPreview] = useState(null);
  const [map, setMap] = useState({});
  const [append, setAppend] = useState(true);
  const [preset, setPreset] = useState("default");
  const FIELDS = [
    { key: "name", label: "Driver Name" }, { key: "recruiter", label: "Recruiter" }, { key: "source", label: "Source" },
    { key: "startDate", label: "Start Date (yyyy-mm-dd)" }, { key: "week1Note", label: "Week1 Note" },
    { key: "week2Note", label: "Week2 Note" }, { key: "week3Note", label: "Week3 Note" }, { key: "week4Note", label: "Week4 Note" },
    { key: "hiringCost", label: "Hiring Cost" }, { key: "timeToHireDays", label: "Time to Hire (d)" },
    { key: "orientationDate", label: "Orientation Date" }, { key: "passedOrientation", label: "Passed Orientation (Y/N)" },
    { key: "passed90Days", label: "Passed 90d (Y/N)" }, { key: "status", label: "Status (Active/Terminated)" },
    { key: "termDate", label: "Termination Date" }, { key: "termReason", label: "Termination Reason" }
  ];

  const applyPreset = (p, headers) => {
    if (p === "default") { const mm = {}; FIELDS.forEach(f => { if (headers.includes(f.key)) mm[f.key] = f.key; }); return mm; }
    if (p === "agency") {
      const guess = { Name: "name", Recruiter: "recruiter", Source: "source", Start: "startDate", W1: "week1Note", W2: "week2Note", W3: "week3Note", W4: "week4Note", Cost: "hiringCost", TTH: "timeToHireDays", Orient: "orientationDate", OrientPass: "passedOrientation", Pass90: "passed90Days", Status: "status", TermDate: "termDate", Reason: "termReason" };
      const mm = {}; Object.entries(guess).forEach(([from, to]) => { if (headers.includes(from)) mm[to] = from; }); return mm;
    }
    return {};
  };

  const onFile = async (e) => { const file = e.target.files?.[0]; if (!file) return; const rows = await fromCSVFile(file); if (!rows.length) { setPreview(null); return; } const headers = Object.keys(rows[0]); setPreview({ headers, rows }); setMap(applyPreset(preset, headers)); e.target.value = ""; };

  const applyImport = () => {
    if (!preview) return;
    const mapped = preview.rows.map((r) => { const d = newDriver(); Object.entries(map).forEach(([field, header]) => { d[field] = r[header] ?? d[field]; }); return d; });
    if (append) pushHistory([...(drivers || []), ...mapped]); else pushHistory(mapped);
    setPreview(null); setMap({});
  };

  const exportCSV = () => {
    const csv = toCSV(drivers.map(({ archived, id, ...rest }) => rest));
    if (!csv) { alert("No data to export"); return; }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `drivers_${todayLocalISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const wipe = () => { if (!confirm("This will clear ALL driver data. Continue?")) return; setDrivers([]); localStorage.removeItem(LS_KEY + ":drivers"); };

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <h2 className="font-semibold mb-3">Import / Export</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="px-3 py-2 rounded-xl bg-white border cursor-pointer">Import CSV<input type="file" accept=".csv" className="hidden" onChange={onFile} /></label>
          <label className="text-sm flex items-center gap-2">Append<input type="checkbox" checked={append} onChange={(e) => setAppend(e.target.checked)} /></label>
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className="px-2 py-1 border rounded-lg">
            <option value="default">Preset: Default headers</option>
            <option value="agency">Preset: Agency export</option>
          </select>
          <button onClick={applyImport} disabled={!preview} className={`px-3 py-2 rounded-xl border ${preview ? "bg-black text-white" : "bg-white text-slate-400"}`}>Apply Mapping</button>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportCSV} className="px-3 py-2 rounded-xl bg-white border">Export CSV</button>
            <button onClick={wipe} className="px-3 py-2 rounded-xl bg-red-600 text-white">Clear ALL data</button>
          </div>
        </div>

        {preview && (
          <div className="bg-slate-50 border rounded-2xl p-3 mt-3">
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

      <div className="bg-white rounded-2xl p-4 border shadow-sm">
        <h2 className="font-semibold mb-2">Saved Views</h2>
        <div className="text-sm text-slate-500">Views are saved automatically in your browser. Manage them here if you want to rename or remove.</div>
        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.keys(savedViews).length === 0 && <div className="text-slate-400">No saved views yet. Create on Follow-Ups tab.</div>}
          {Object.entries(savedViews).map(([name, conf]) => (
            <div key={name} className="px-3 py-2 rounded-xl border flex items-center justify-between">
              <div>
                <div className="font-medium">{name}</div>
                <div className="text-xs text-slate-500">{Object.entries(conf).map(([k, v]) => v ? `${k}:${v}` : null).filter(Boolean).join(" • ") || "All"}</div>
              </div>
              <button
                onClick={() => { const n = prompt("Rename view", name); if (!n || n === name) return; const copy = { ...savedViews }; copy[n] = copy[name]; delete copy[name]; setSavedViews(copy); }}
                className="px-2 py-1 rounded-lg border"
              >Rename</button>
            </div>
          ))}
        </div>
      </div>

      <TestsPanel />
    </section>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm">
      <div className="font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function TestsPanel() {
  const [results, setResults] = useState([]);
  const run = () => {
    const res = []; const assert = (name, cond) => res.push({ name, pass: !!cond });
    const csv1 = `a,b\n1,2\n3,4\n`; const r1 = parseCSVText(csv1); assert("LF newline split", r1.length === 2 && r1[0].a === "1" && r1[1].b === "4");
    const csv2 = `a,b\r\n1,2\r\n3,4\r\n`; const r2 = parseCSVText(csv2); assert("CRLF newline split", r2.length === 2 && r2[1].b === "4");
    const csv3 = `name,company\nJohn,"Acme, Inc."\n`; const r3 = parseCSVText(csv3); assert("Quoted comma", r3[0].company === "Acme, Inc.");
    const csv4 = `name,note\nJohn,"Line1\nLine2"\n`; const r4 = parseCSVText(csv4); assert("Multiline field", r4.length === 1 && r4[0].note === "Line1\nLine2");
    const tmpDrivers = [{ startDate: "2025-08-01", status: "Active" }, { startDate: "2025-08-01", status: "Terminated", termDate: "2025-08-15" }];
    const hcStart = (date) => tmpDrivers.filter(d => parseISO(d.startDate) <= parseISO(date) && (!(d.status === 'Terminated' && d.termDate) || parseISO(d.termDate) > parseISO(date))).length;
    const start = firstOfMonth("2025-08"); const end = lastOfMonth("2025-08"); const avgHC = (hcStart(start) + hcStart(end)) / 2; const leavers = tmpDrivers.filter(d => d.status === 'Terminated' && ym(d.termDate) === '2025-08').length;
    assert("Retention formula B", Math.round((1 - (leavers / avgHC)) * 100) === 33);
    setResults(res);
  };
  return (
    <Card title="Built-in Tests">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={run} className="px-3 py-2 rounded-xl bg-white border">Run tests</button>
        <span className="text-slate-500 text-sm">(CSV multiline + Retention B)</span>
      </div>
      {!!results.length && (
        <ul className="space-y-1 text-sm">
          {results.map((r, i) => (<li key={i} className={r.pass ? "text-green-700" : "text-red-700"}>{r.pass ? "✅" : "❌"} {r.name}</li>))}
        </ul>
      )}
    </Card>
  );
}

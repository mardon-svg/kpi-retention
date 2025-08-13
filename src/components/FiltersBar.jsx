import React from 'react';
import { parseISO, todayLocalISO, firstOfMonth, ym, toLocalISO } from '../lib/date';

export default function FiltersBar({ filters, setFilters, savedViews, setSavedViews, recruiters = [], sources = [] }) {
  const update = (patch) => setFilters({ ...filters, ...patch });

  const quickRange = (key) => {
    const today = parseISO(todayLocalISO());
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = firstOfMonth(ym(todayLocalISO()));
    if (key === 'week') update({ from: toLocalISO(startOfWeek), to: todayLocalISO() });
    if (key === 'month') update({ from: startOfMonth, to: todayLocalISO() });
    if (key === 'clear') update({ from: '', to: '' });
  };

  const saveView = () => {
    const name = prompt('Name this view'); if (!name) return;
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
        <input type="date" value={filters.from || ''} onChange={(e) => update({ from: e.target.value })} className="px-2 py-1 border rounded-lg" />
        <span>→</span>
        <input type="date" value={filters.to || ''} onChange={(e) => update({ to: e.target.value })} className="px-2 py-1 border rounded-lg" />
        <button onClick={() => quickRange('week')} className="btn px-2 py-1 rounded-lg border bg-white">This week</button>
        <button onClick={() => quickRange('month')} className="btn px-2 py-1 rounded-lg border bg-white">This month</button>
        <button onClick={() => quickRange('clear')} className="btn px-2 py-1 rounded-lg border bg-white">Clear</button>
      </div>

      <div className="flex items-center gap-2 ml-2">
        <select value={filters.recruiter || ''} onChange={(e) => update({ recruiter: e.target.value })} className="px-2 py-1 border rounded-lg">
          <option value="">All recruiters</option>
          {recruiters.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.source || ''} onChange={(e) => update({ source: e.target.value })} className="px-2 py-1 border rounded-lg">
          <option value="">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <select value={filters.view || ''} onChange={(e) => loadView(e.target.value)} className="px-2 py-1 border rounded-lg">
          <option value="">Load view…</option>
          {Object.keys(savedViews || {}).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={saveView} className="btn px-3 py-2 rounded-xl border bg-white">Save view</button>
      </div>
    </div>
  );
}

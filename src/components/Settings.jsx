import React, { useState } from 'react';
import { todayLocalISO } from '../lib/date';
import { LS_KEY } from '../lib/storage';

function Settings({ drivers, setDrivers, sheetUrl, setSheetUrl, onSyncNow, autoSyncEnabled, setAutoSyncEnabled, newDriver, fromCSVFile, toCSV }) {
  const [preview, setPreview] = useState(null);
  const [map, setMap] = useState({});
  const FIELDS = [
    { key: 'name', label: 'Driver Name' }, { key: 'recruiter', label: 'Recruiter' }, { key: 'source', label: 'Source' },
    { key: 'startDate', label: 'Start Date (yyyy-mm-dd)' }, { key: 'week1Note', label: 'Week1 Note' },
    { key: 'week2Note', label: 'Week2 Note' }, { key: 'week3Note', label: 'Week3 Note' }, { key: 'week4Note', label: 'Week4 Note' },
    { key: 'hiringCost', label: 'Hiring Cost' }, { key: 'timeToHireDays', label: 'Time to Hire (d)' },
    { key: 'orientationDate', label: 'Orientation Date' }, { key: 'passedOrientation', label: 'Passed Orientation (Y/N)' },
    { key: 'passed90Days', label: 'Passed 90d (Y/N)' }, { key: 'status', label: 'Status (Active/Terminated)' },
    { key: 'termDate', label: 'Termination Date' }, { key: 'termReason', label: 'Termination Reason' }
  ];

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = await fromCSVFile(file);
    if (!rows.length) { setPreview(null); return; }
    setPreview({ headers: Object.keys(rows[0]), rows });
    const mm = {}; FIELDS.forEach(f => { if (rows[0][f.key] !== undefined) mm[f.key] = f.key; });
    setMap(mm); e.target.value = '';
  };

  const applyImport = () => {
    if (!preview) return;
    const mapped = preview.rows.map((r) => {
      const d = newDriver();
      Object.entries(map).forEach(([field, header]) => {
        const value = r[header];
        if (field === 'id') {
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
    if (!csv) { alert('No data to export'); return; }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `drivers_${todayLocalISO()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const wipe = () => {
    if (!confirm('This will clear ALL driver data. Continue?')) return;
    setDrivers([]);
    localStorage.removeItem(LS_KEY + ':drivers');
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
          <button onClick={applyImport} disabled={!preview} className={`btn px-3 py-2 rounded-xl border ${preview ? 'bg-black text-white' : 'bg-white text-slate-400'}`}>Apply Mapping</button>
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
                  <select value={map[f.key] || ''} onChange={(e) => setMap({ ...map, [f.key]: e.target.value })} className="px-2 py-1 border rounded-lg flex-1">
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
    </section>
  );
}

export default Settings;

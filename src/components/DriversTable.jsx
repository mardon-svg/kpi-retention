import React from 'react';

function DriversTable({ drivers, up, addDriver, recruiters, sources }) {
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
                <td className="py-2 px-2"><select value={d.recruiter} onChange={(e) => up(d.id, { recruiter: e.target.value })} className="px-2 py-1 border rounded-lg w-36"><option value="">—</option>{recruiters.map(r => <option key={r}>{r}</option>)}</select></td>
                <td className="py-2 px-2"><select value={d.source} onChange={(e) => up(d.id, { source: e.target.value })} className="px-2 py-1 border rounded-lg w-36"><option value="">—</option>{sources.map(s => <option key={s}>{s}</option>)}</select></td>
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

export default DriversTable;

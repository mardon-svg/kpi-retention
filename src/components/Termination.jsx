import React from 'react';

function Termination({ drivers, up, can }) {
  const active = drivers.filter(d => d.status !== 'Terminated');
  const leavers = drivers.filter(d => d.status === 'Terminated');

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
                const needsDate = (d.status === 'Terminated' && !d.termDate);
                return (
                  <tr key={d.id} className="border-t">
                    <td className="py-2 px-2">{d.name || '—'}</td>
                    <td className="py-2 px-2">{d.recruiter || '—'}</td>
                    <td className="py-2 px-2">{d.startDate || '—'}</td>
                    <td className="py-2 px-2">
                      <select
                        value={d.status}
                        onChange={(e) => {
                          if (!can.setTermination) return;
                          const status = e.target.value;
                          up(
                            d.id,
                            status === 'Active'
                              ? { status, termDate: '', termReason: '' }
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
                          up(d.id, { termDate: value });
                        }}
                        className={`px-2 py-1 border rounded-lg w-40 ${needsDate ? 'border-red-500' : ''}`}
                        disabled={!can.setTermination || d.status !== 'Terminated'}
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
                        disabled={!can.setTermination || d.status !== 'Terminated'}
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
                  <td className="py-2 px-2">{d.recruiter || '—'}</td>
                  <td className="py-2 px-2">{d.startDate || '—'}</td>
                  <td className="py-2 px-2">{d.termDate || '—'}</td>
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
                        up(d.id, { status: 'Active', termDate: '', termReason: '' });
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

export default Termination;

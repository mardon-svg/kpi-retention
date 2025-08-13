import React from 'react';

function AppShell({ children, current, setCurrent }) {
  const tabs = ['Dashboard','Recruitment','Follow-Ups','Termination','KPI','Settings'];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">KPI & Driver Retention</h1>
          <div className="text-slate-500">Local mode • All data saved in your browser</div>
        </header>
        <nav className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setCurrent(t)}
              className={`btn px-3 py-2 rounded-xl border ${t === current ? 'bg-black text-white' : 'bg-white'}`}
            >
              {t}
            </button>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}

export default AppShell;

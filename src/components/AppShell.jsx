import React from 'react';
import { TabList, Tab } from './ui/Tabs';

function AppShell({ children, current, setCurrent }) {
  const tabs = ['Dashboard','Recruitment','Follow-Ups','Termination','KPI','Settings'];
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 py-6">
          <h1 className="text-2xl font-bold tracking-tight">KPI & Driver Retention</h1>
          <div className="text-sm text-gray-500">Local mode • All data saved in your browser</div>
        </div>
        <div className="container mx-auto pb-4">
          <TabList>
            {tabs.map(t => (
              <Tab key={t} selected={t === current} onClick={() => setCurrent(t)}>
                {t}
              </Tab>
            ))}
          </TabList>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default AppShell;

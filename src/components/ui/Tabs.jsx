import React from 'react';

export function TabList({ className = '', ...props }) {
  return <div role="tablist" className={`tablist ${className}`} {...props} />;
}

export function Tab({ selected = false, className = '', ...props }) {
  return <button role="tab" aria-selected={selected} className={`tab ${className}`} {...props} />;
}

export default { TabList, Tab };

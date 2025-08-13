import React from 'react';

function Select({ label, help, className = '', children, ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      <select className={`select ${className}`} {...props}>
        {children}
      </select>
      {help && <span className="text-xs text-gray-500">{help}</span>}
    </label>
  );
}

export default Select;

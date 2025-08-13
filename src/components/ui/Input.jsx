import React from 'react';

function Input({ label, help, className = '', ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      <input className={`input ${className}`} {...props} />
      {help && <span className="text-xs text-gray-500">{help}</span>}
    </label>
  );
}

export default Input;

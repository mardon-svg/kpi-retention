import React from 'react';

function Badge({ variant = 'gray', className = '', children, ...props }) {
  const variants = {
    accent: 'badge-accent',
    gray: 'badge-gray',
  };
  return (
    <span className={`badge ${variants[variant] || ''} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;

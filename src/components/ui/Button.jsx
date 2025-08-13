import React from 'react';

function Button({ variant = 'primary', className = '', loading = false, disabled = false, children, ...props }) {
  const variants = {
    primary: 'btn-primary',
    accent: 'btn-accent',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  };
  return (
    <button
      className={`btn ${variants[variant] || ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export default Button;

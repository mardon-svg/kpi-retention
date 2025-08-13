import React, { useEffect } from 'react';

function Toast({ open, message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50" role="alert">
      <div className="card px-4 py-2 shadow-lg">{message}</div>
    </div>
  );
}

export default Toast;

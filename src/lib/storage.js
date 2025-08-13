import { useState, useEffect } from 'react';

export const LS_KEY = 'kpi_retention_v3';

export const useLocalState = (key, initial) => {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [key, state]);

  return [state, setState];
};

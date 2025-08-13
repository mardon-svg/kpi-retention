export const pad = (n) => String(n).padStart(2, "0");
export const toLocalISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parseISO = (iso) => {
  if (!iso) return null;
  const [y,m,dd] = iso.split("-").map(Number);
  if (!y || !m || !dd) return null;
  const d = new Date(y, m - 1, dd);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== dd) return null;
  return d;
};
export const addDaysLocal = (iso, n) => {
  const d = parseISO(iso);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};
export const todayLocalISO = () => toLocalISO(new Date());
export const firstOfMonth = (ym) => { const [y,m]=ym.split('-').map(Number); return toLocalISO(new Date(y, m-1, 1)); };
export const lastOfMonth = (ym) => { const [y,m]=ym.split('-').map(Number); return toLocalISO(new Date(y, m, 0)); };
export const ym = (iso) => (iso ? iso.slice(0,7) : "");
export const fmtPct = (n) => `${Math.round((n||0)*100)}%`;

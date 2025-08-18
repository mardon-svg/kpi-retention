import { parseISO, firstOfMonth, lastOfMonth, ym, todayLocalISO, pad } from "./date";

function monthRange(drivers) {
  const startDates = drivers.map(d => d.startDate).filter(Boolean).sort();
  if (!startDates.length) return [];
  const earliest = ym(startDates[0]);
  const latestDate = drivers
    .flatMap(d => [d.startDate, d.termDate])
    .concat(todayLocalISO())
    .filter(Boolean)
    .sort()
    .pop();
  const latest = ym(latestDate);
  const months = [];
  let [y, m] = earliest.split("-").map(Number);
  const [ly, lm] = latest.split("-").map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    months.push(`${y}-${pad(m)}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

export function calculateMonthlyStats(drivers = []) {
  const months = monthRange(drivers);

  const headcountOn = (isoDate) =>
    drivers.filter(d => {
      if (!d.startDate) return false;
      const sd = parseISO(d.startDate);
      const date = parseISO(isoDate);
      if (sd > date) return false;
      if (d.status === "Terminated" && d.termDate) return parseISO(d.termDate) > date;
      return true;
    }).length;

  const leaversInMonth = (ymonth) =>
    drivers.filter(d => d.status === "Terminated" && d.termDate && ym(d.termDate) === ymonth).length;

  const monthly = months.map(m => {
    const start = firstOfMonth(m);
    const end = lastOfMonth(m);
    const hcStart = headcountOn(start);
    const hcEnd = headcountOn(end);
    const avgHC = (hcStart + hcEnd) / 2;
    const leavers = leaversInMonth(m);
    const retentionPct = avgHC ? 1 - leavers / avgHC : 0;
    return { month: m, hcStart, hcEnd, avgHC, leavers, retentionPct };
  });

  return { months, monthly };
}

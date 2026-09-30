import type { ActiveTimer, StudySession } from './model';
export const dayKey = (value: number | Date = Date.now()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const shiftDay = (s: string, amount: number) => {
  const d = parseDay(s);
  d.setDate(d.getDate() + amount);
  return dayKey(d);
};
export const weekKey = (s: string) => {
  const d = parseDay(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
};
export function duration(ms: number, seconds = false) {
  const total = Math.max(0, Math.floor(ms / 1000)),
    h = Math.floor(total / 3600),
    m = Math.floor((total % 3600) / 60),
    s = total % 60;
  if (seconds)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
export const dateLabel = (n: number, opts?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(
    'en-US',
    opts ?? { month: 'short', day: 'numeric', year: 'numeric' },
  ).format(n);
export const elapsed = (timer: ActiveTimer | null, now = Date.now()) =>
  timer
    ? timer.segments.reduce((a, s) => a + s.end - s.start, 0) +
      (timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince))
    : 0;
export const remaining = (timer: ActiveTimer | null, now = Date.now()) =>
  timer ? Math.max(0, timer.targetMs - elapsed(timer, now)) : 0;
export function splitByDay(segments: StudySession['segments']): Map<string, number> {
  const days = new Map<string, number>();
  for (const s of segments) {
    let cursor = s.start;
    while (cursor < s.end) {
      const d = new Date(cursor);
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const end = Math.min(next, s.end);
      const key = dayKey(cursor);
      days.set(key, (days.get(key) ?? 0) + end - cursor);
      cursor = end;
    }
  }
  return days;
}
export function getStats(sessions: StudySession[], now = Date.now()) {
  const today = dayKey(now),
    daily = new Map<string, number>(),
    weeks = new Map<string, number>(),
    months = new Map<string, number>(),
    byTopic = new Map<string, number>();
  for (const s of sessions) {
    if (s.startedAt > now) continue;
    const segments = s.segments
      .filter((x) => x.start < now)
      .map((x) => ({ start: x.start, end: Math.min(x.end, now) }));
    const sessionTotal = segments.reduce((sum, x) => sum + x.end - x.start, 0);
    byTopic.set(s.topicId, (byTopic.get(s.topicId) ?? 0) + sessionTotal);
    for (const [d, n] of splitByDay(segments)) {
      daily.set(d, (daily.get(d) ?? 0) + n);
    }
  }
  for (const [d, n] of daily) {
    const w = weekKey(d),
      m = d.slice(0, 7);
    weeks.set(w, (weeks.get(w) ?? 0) + n);
    months.set(m, (months.get(m) ?? 0) + n);
  }
  const keys = [...daily.keys()].filter((d) => d <= today && (daily.get(d) ?? 0) > 0).sort();
  const past = keys;
  let longestStreak = 0,
    streak = 0,
    prev = '';
  for (const d of past) {
    streak = prev && shiftDay(prev, 1) === d ? streak + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
    prev = d;
  }
  let currentStreak = 0,
    cursor = daily.has(today) ? today : shiftDay(today, -1);
  while (daily.has(cursor)) {
    currentStreak++;
    cursor = shiftDay(cursor, -1);
  }
  const total = [...daily.values()].reduce((a, b) => a + b, 0),
    sumSince = (n: number) =>
      [...daily]
        .filter(([d]) => d >= shiftDay(today, 1 - n) && d <= today)
        .reduce((a, [, b]) => a + b, 0);
  const first = past[0] ?? today;
  const calendarDays = Math.max(
    1,
    Math.round((Date.UTC(...parseDayParts(today)) - Date.UTC(...parseDayParts(first))) / 86400000) +
      1,
  );
  return {
    daily,
    weeks,
    months,
    byTopic,
    total,
    today: daily.get(today) ?? 0,
    thisWeek: weeks.get(weekKey(today)) ?? 0,
    thisMonth: months.get(today.slice(0, 7)) ?? 0,
    averageCalendar: total / calendarDays,
    averageActive: keys.length ? total / keys.length : 0,
    average7: sumSince(7) / 7,
    average30: sumSince(30) / 30,
    longestDay: [...daily.values()].reduce((max, n) => Math.max(max, n), 0),
    longestSession: sessions
      .filter((s) => s.startedAt <= now)
      .reduce(
        (max, s) =>
          Math.max(
            max,
            s.segments
              .filter((x) => x.start < now)
              .reduce((sum, x) => sum + Math.min(x.end, now) - x.start, 0),
          ),
        0,
      ),
    bestWeek: [...weeks.values()].reduce((max, n) => Math.max(max, n), 0),
    bestMonth: [...months.values()].reduce((max, n) => Math.max(max, n), 0),
    longestStreak,
    currentStreak,
    calendarDays,
    activeDays: keys.length,
  };
}
function parseDayParts(s: string): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m - 1, d];
}
export function nextTestDay(day: number, now = Date.now()) {
  const date = new Date(now);
  date.setDate(date.getDate() + ((day - date.getDay() + 7) % 7));
  return date;
}

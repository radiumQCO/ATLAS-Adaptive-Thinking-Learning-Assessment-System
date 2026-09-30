import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useAtlas, selectTopic } from '../app/store';
import {
  dayKey,
  dateLabel,
  duration,
  durationOnDay,
  getStats,
  parseDay,
  shiftDay,
} from '../lib/time';
import { Button, Empty, IconButton, PageHeader, SectionTitle } from '../components/ui';
export function History() {
  const { data } = useAtlas(),
    d = data!;
  const stats = useMemo(() => getStats(d.sessions), [d.sessions]);
  const [tab, setTab] = useState('calendar'),
    [selected, setSelected] = useState(dayKey()),
    [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    [year, setYear] = useState(new Date().getFullYear());
  const entries = useMemo(
    () =>
      d.sessions
        .map((s) => ({ ...s, dayDuration: durationOnDay(s.segments, selected) }))
        .filter((s) => s.dayDuration > 0)
        .sort((a, b) => a.startedAt - b.startedAt),
    [d.sessions, selected],
  );
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    padding = (month.getDay() + 6) % 7;
  const selectDate = (k: string) => {
    setSelected(k);
    const day = parseDay(k);
    setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  };
  const metrics = [
    ['Total lifetime', stats.total],
    ['Today', stats.today],
    ['This week', stats.thisWeek],
    ['This month', stats.thisMonth],
    ['Average / calendar day', stats.averageCalendar],
    ['Average / active day', stats.averageActive],
    ['Last 7 days / day', stats.average7],
    ['Last 30 days / day', stats.average30],
  ] as const;
  const records = [
    ['Longest study day', duration(stats.longestDay)],
    ['Longest session', duration(stats.longestSession)],
    ['Best week', duration(stats.bestWeek)],
    ['Best month', duration(stats.bestMonth)],
    ['Current streak', `${stats.currentStreak} days`],
    ['Longest streak', `${stats.longestStreak} days`],
  ];
  const byTopic = new Map<string, number>();
  for (const s of entries) byTopic.set(s.topicId, (byTopic.get(s.topicId) ?? 0) + s.dayDuration);
  const largestTopic = [...stats.byTopic.values()].reduce((max, n) => Math.max(max, n), 1);
  return (
    <div className="page history-page">
      <PageHeader
        eyebrow="THE TIME BEHIND THE UNDERSTANDING"
        title="Small days. Lasting progress."
        description="A record of showing up, in your own rhythm."
      />
      <div className="tab-strip page-tabs">
        {['calendar', 'statistics', 'year'].map((t) => (
          <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>
            {t === 'year' ? 'A year in view' : t}
          </button>
        ))}
      </div>
      {tab === 'calendar' && (
        <div className="calendar-layout">
          <section className="calendar-paper">
            <div className="calendar-header">
              <h2>{dateLabel(month.getTime(), { month: 'long', year: 'numeric' })}</h2>
              <IconButton
                label="Previous month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <IconButton
                label="Next month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <ChevronRight size={18} />
              </IconButton>
            </div>
            <div className="calendar-grid">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => (
                <span key={`w${i}`} className="weekday">
                  {x}
                </span>
              ))}
              {Array.from({ length: padding }, (_, i) => (
                <span key={`p${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const key = dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1)),
                  n = stats.daily.get(key) ?? 0;
                return (
                  <button
                    key={key}
                    className={`calendar-day ${key === selected ? 'selected' : ''} ${key === dayKey() ? 'today' : ''}`}
                    aria-label={`${key}, ${duration(n)} studied`}
                    aria-pressed={key === selected}
                    onClick={() => setSelected(key)}
                  >
                    <span>{i + 1}</span>
                    <i style={{ opacity: n ? Math.max(0.2, Math.min(1, n / 14400000)) : 0 }} />
                  </button>
                );
              })}
            </div>
            <div className="calendar-bottom">
              <Button variant="ghost" onClick={() => selectDate(dayKey())}>
                Back to today
              </Button>
              <label className="date-jump">
                Jump to
                <input
                  type="date"
                  aria-label="Choose any date"
                  value={selected}
                  onChange={(e) => {
                    if (e.target.value) selectDate(e.target.value);
                  }}
                />
              </label>
            </div>
            <p className="hint calendar-hint">
              Every orange mark is a little time invested in yourself.
            </p>
          </section>
          <section className="day-journal">
            <div className="eyebrow">
              {dateLabel(parseDay(selected).getTime(), { weekday: 'long' })}
            </div>
            <h2>
              {dateLabel(parseDay(selected).getTime(), {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>
            <div className="day-total">
              {duration(stats.daily.get(selected) ?? 0)}
              <span>total studied</span>
            </div>
            {entries.length ? (
              <>
                <div className="day-topic-totals">
                  {[...byTopic].map(([id, n]) => (
                    <div key={id}>
                      <button onClick={() => selectTopic(id)}>
                        {d.topics.find((t) => t.id === id)?.name}
                      </button>
                      <strong>{duration(n)}</strong>
                    </div>
                  ))}
                </div>
                <SectionTitle>Pages from this day</SectionTitle>
                {entries.map((s) => (
                  <div className="journal-session" key={s.id}>
                    <div>
                      <strong>
                        {d.topics.find((t) => t.id === s.topicId)?.name}
                        {s.subtopicId && (
                          <span className="hint">
                            {' '}
                            / {d.topics.find((t) => t.id === s.subtopicId)?.name}
                          </span>
                        )}
                      </strong>
                      <span>{duration(s.dayDuration)}</span>
                    </div>
                    <small>
                      {dateLabel(s.startedAt, { hour: 'numeric', minute: '2-digit' })} –{' '}
                      {dateLabel(s.endedAt, { hour: 'numeric', minute: '2-digit' })}
                      {s.demo ? ' · Demo session' : ''}
                    </small>
                    {s.note && <p>{s.note}</p>}
                  </div>
                ))}
              </>
            ) : (
              <Empty title="A quiet page">
                No study sessions on this date. Rest is part of the rhythm, too.
              </Empty>
            )}
          </section>
        </div>
      )}
      {tab === 'statistics' && (
        <>
          <div className="stats-grid">
            {metrics.map(([label, value]) => (
              <div className="stat-cell" key={label}>
                <span>{label}</span>
                <strong>{duration(value)}</strong>
              </div>
            ))}
          </div>
          <p className="hint averages-note">
            Calendar average includes every day since your first session ({stats.calendarDays}{' '}
            days). Active-day average includes only days you studied ({stats.activeDays} days).
            Weeks begin on Monday; session time is split at local midnight.
          </p>
          <SectionTitle aside={<Trophy size={18} />}>Personal bests</SectionTitle>
          <div className="records-grid">
            {records.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <SectionTitle>Where your curiosity takes you</SectionTitle>
          <div className="rank-list">
            {[...stats.byTopic]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([id, n], i) => (
                <div key={id}>
                  <span className="rank-number">{String(i + 1).padStart(2, '0')}</span>
                  <button onClick={() => selectTopic(id)}>
                    {d.topics.find((t) => t.id === id)?.name}
                  </button>
                  <div className="rank-bar">
                    <span style={{ width: `${(n / largestTopic) * 100}%` }} />
                  </div>
                  <strong>{duration(n)}</strong>
                </div>
              ))}
            {!stats.total && (
              <Empty title="Progress begins with a session">
                Your study records will grow here.
              </Empty>
            )}
          </div>
        </>
      )}
      {tab === 'year' && (
        <section className="year-paper">
          <div className="section-heading">
            <h2>{year} · a little, often</h2>
            <div className="inline">
              <IconButton label="Previous year" onClick={() => setYear(year - 1)}>
                <ChevronLeft size={18} />
              </IconButton>
              <IconButton label="Next year" onClick={() => setYear(year + 1)}>
                <ChevronRight size={18} />
              </IconButton>
            </div>
          </div>
          <YearGrid
            year={year}
            daily={stats.daily}
            onSelect={(key) => {
              selectDate(key);
              setTab('calendar');
            }}
          />
          <div className="heatmap-legend">
            <span>Quiet</span>
            {[0, 0.2, 0.4, 0.7, 1].map((x) => (
              <i
                key={x}
                style={{
                  background: x
                    ? `color-mix(in srgb, var(--orange) ${x * 100}%, var(--paper))`
                    : 'var(--line)',
                }}
              />
            ))}
            <span>Immersed</span>
          </div>
          <div className="year-summary">
            <strong>
              {duration(
                [...stats.daily]
                  .filter(([k]) => k.startsWith(`${year}-`))
                  .reduce((a, [, b]) => a + b, 0),
              )}
            </strong>
            <span>collected in {year} · select any square to open that day's journal</span>
          </div>
        </section>
      )}
    </div>
  );
}
function YearGrid({
  year,
  daily,
  onSelect,
}: {
  year: number;
  daily: Map<string, number>;
  onSelect: (s: string) => void;
}) {
  const start = `${year}-01-01`,
    offset = (parseDay(start).getDay() + 6) % 7;
  const days = Math.round(
    (new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / 86400000,
  );
  return (
    <div className="heatmap-scroll">
      <div className="month-labels">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>{dateLabel(new Date(year, i, 1).getTime(), { month: 'short' })}</span>
        ))}
      </div>
      <div className="year-grid">
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = shiftDay(start, i),
            ms = daily.get(key) ?? 0;
          return (
            <button
              key={key}
              aria-label={`${key}: ${duration(ms)}`}
              title={`${key} · ${duration(ms)}`}
              onClick={() => onSelect(key)}
              style={{
                background: ms
                  ? `color-mix(in srgb, var(--orange) ${Math.max(15, Math.min(100, (ms / 14400000) * 100))}%, var(--paper))`
                  : 'var(--line-soft)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

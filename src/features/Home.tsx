import { ArrowRight, ArrowUpRight, Plus, Sparkles } from 'lucide-react';
import { navigate, setAdding, useAtlas } from '../app/store';
import { dayKey, dateLabel, duration, getStats, shiftDay, nextTestDay } from '../lib/time';
import { Button, Empty, MasterySquare, SectionTitle, TopicRow } from '../components/ui';
export function Home() {
  const { data } = useAtlas(),
    d = data!,
    stats = getStats(d.sessions),
    queue = d.topics.filter((t) => t.mastery === 2),
    passed = d.topics.filter((t) => t.mastery === 3).length;
  const recent = [...d.topics].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(dayKey(), i - 6)),
    max = Math.max(3600000, ...days.map((x) => stats.daily.get(x) ?? 0)),
    goal = d.settings.dailyGoal * 60000;
  return (
    <div className="page home-page">
      <div className="home-date">
        <span>{dateLabel(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <span>ONE IDEA AT A TIME</span>
      </div>
      <section className="home-hero">
        <div>
          <span className="eyebrow">A NOTEBOOK FOR YOUR MIND</span>
          <h1>
            Make room for
            <br />
            <em>understanding.</em>
          </h1>
          <p>
            Follow your curiosity. Connect the pieces.
            <br />
            Build knowledge that stays with you.
          </p>
          <div className="hero-actions">
            <Button onClick={() => navigate('study')}>
              Start a study session <ArrowUpRight size={17} />
            </Button>
            <Button variant="ghost" onClick={() => setAdding(true)}>
              <Plus size={16} />
              New topic
            </Button>
          </div>
        </div>
        <div className="notebook-sketch" aria-hidden="true">
          <div className="sketch-stamp">a work in progress</div>
          <svg viewBox="0 0 290 200">
            <path className="sketch-line" d="M40 78H100V132H160V78H220M100 78V35H160" />
            <rect x="18" y="56" width="44" height="44" className="sketch-box" />
            <path d="M19 100V57h43Z" className="sketch-ink" />
            <rect x="78" y="110" width="44" height="44" className="sketch-box" />
            <path d="M79 132h42v21H79z" className="sketch-ink" />
            <rect x="138" y="56" width="44" height="44" className="sketch-box filled" />
            <rect x="198" y="56" width="44" height="44" className="sketch-box" />
            <rect x="138" y="13" width="44" height="44" className="sketch-box" />
            <text x="22" y="120">
              question
            </text>
            <text x="136" y="119">
              understand
            </text>
            <text x="187" y="41">
              what comes next?
            </text>
          </svg>
          <div className="sketch-caption">Small pieces. A bigger picture.</div>
        </div>
      </section>
      <section className="daily-strip">
        <div>
          <span className="eyebrow">TODAY'S QUIET PROGRESS</span>
          <div className="today-number">
            {duration(stats.today)}
            <span>{goal ? ` / ${duration(goal)} daily goal` : ' studied today'}</span>
          </div>
        </div>
        <div className="goal-track-wrap">
          <div className="goal-track">
            <span style={{ width: `${goal ? Math.min(100, (stats.today / goal) * 100) : 0}%` }} />
          </div>
          <span>
            {goal
              ? stats.today >= goal
                ? 'Your daily intention, fulfilled.'
                : `${duration(Math.max(0, goal - stats.today))} to your daily intention`
              : 'Set a daily intention in Settings'}
          </span>
        </div>
        <button
          className="round-arrow"
          aria-label="Open study history"
          onClick={() => navigate('history')}
        >
          <ArrowUpRight size={19} />
        </button>
      </section>
      <section className="knowledge-metrics">
        <div>
          <span>Ideas in your notebook</span>
          <strong>
            {d.topics.length}
            <small>{d.subjects.length} subjects to explore</small>
          </strong>
        </div>
        <div>
          <span>Knowledge that stayed</span>
          <strong>
            {passed}
            <small>topics passed their test</small>
          </strong>
        </div>
        <div>
          <span>A rhythm worth keeping</span>
          <strong>
            {stats.currentStreak}
            <small>{stats.currentStreak === 1 ? 'day' : 'days'} in your current streak</small>
          </strong>
        </div>
      </section>
      <div className="home-columns">
        <section>
          <SectionTitle
            aside={
              <button className="text-button" onClick={() => navigate('checklist')}>
                All topics <ArrowRight size={15} />
              </button>
            }
          >
            Open pages
          </SectionTitle>
          <div className="paper-list recent-topics">
            {recent.length ? (
              recent.map((t) => <TopicRow key={t.id} topic={t} />)
            ) : (
              <Empty
                title="Begin with a question"
                action={<Button onClick={() => setAdding(true)}>Add a topic</Button>}
              >
                Your notebook is ready for its first idea.
              </Empty>
            )}
          </div>
        </section>
        <section className="week-panel">
          <SectionTitle aside={<span className="hint">{duration(stats.average7)} / day</span>}>
            Your last seven days
          </SectionTitle>
          <div className="week-chart">
            {days.map((k) => (
              <div
                key={k}
                className={`chart-day ${k === dayKey() ? 'today' : ''}`}
                title={`${k}: ${duration(stats.daily.get(k) ?? 0)}`}
              >
                <div className="bar-track">
                  <span
                    style={{ height: `${Math.max(3, ((stats.daily.get(k) ?? 0) / max) * 100)}%` }}
                  />
                </div>
                <span>
                  {dateLabel(new Date(`${k}T12:00:00`).getTime(), { weekday: 'short' }).slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
          <div className="review-note">
            <span className="review-note-icon">
              <MasterySquare value={2} size={21} />
            </span>
            <div>
              <strong>
                {queue.length} {queue.length === 1 ? 'idea is' : 'ideas are'} ready to revisit
              </strong>
              <p>
                {dateLabel(nextTestDay(d.settings.testDay).getTime(), { weekday: 'long' })} is for
                seeing what stayed.
              </p>
            </div>
            <IconArrow />
          </div>
        </section>
      </div>
      <div className="page-footnote">
        <Sparkles size={13} />
        Understanding grows in the space between questions.
      </div>
    </div>
  );
}
function IconArrow() {
  return (
    <button
      className="icon-btn"
      aria-label="Open retention tests"
      onClick={() => navigate('tests')}
    >
      <ArrowRight size={18} />
    </button>
  );
}

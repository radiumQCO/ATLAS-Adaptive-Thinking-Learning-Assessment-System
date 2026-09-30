import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock, Pause, Play } from 'lucide-react';
import { finishTimer, mutate, navigate, startTimer, toggleTimer, useAtlas } from '../app/store';
import { dateLabel, duration, elapsed, getStats, remaining } from '../lib/time';
import { Button, Empty, PageHeader, SectionTitle, Select } from '../components/ui';
export function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  return now;
}
export function Study() {
  const { data, studyTopic } = useAtlas(),
    d = data!,
    timer = d.timer,
    now = useNow();
  const [topic, setTopic] = useState(studyTopic ?? d.topics[0]?.id ?? ''),
    [subtopic, setSubtopic] = useState(''),
    [minutes, setMinutes] = useState('25');
  useEffect(() => {
    if (studyTopic) {
      let root = d.topics.find((t) => t.id === studyTopic);
      while (root?.parentId) root = d.topics.find((t) => t.id === root?.parentId);
      setTopic(root?.id ?? studyTopic);
      setSubtopic(root?.id === studyTopic ? '' : studyTopic);
    }
  }, [studyTopic]);
  const mainTopics = d.topics.filter((t) => !t.parentId);
  const activeTopic = mainTopics.some((t) => t.id === topic) ? topic : (mainTopics[0]?.id ?? '');
  const children = d.topics.filter((t) => t.parentId === activeTopic);
  const focusMinutes = Number(minutes);
  const validMinutes = Number.isInteger(focusMinutes) && focusMinutes >= 1 && focusMinutes <= 240;
  const stats = getStats(d.sessions);
  const chosen = timer?.topicId ?? activeTopic,
    child = timer?.subtopicId ?? subtopic;
  const current = d.topics.find((t) => t.id === chosen),
    sub = d.topics.find((t) => t.id === child);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) &&
        !target.isContentEditable &&
        !document.querySelector('dialog[open]')
      ) {
        e.preventDefault();
        if (timer) toggleTimer();
        else if (activeTopic && validMinutes)
          startTimer(activeTopic, subtopic || null, focusMinutes);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [timer, activeTopic, subtopic, validMinutes, focusMinutes]);
  const ms = elapsed(timer, now);
  const timeLeft = timer ? remaining(timer, now) : validMinutes ? focusMinutes * 60_000 : 0;
  const dialProgress = timer ? Math.min(100, (ms / timer.targetMs) * 100) : 0;
  const markerAngle = -Math.PI / 2 + (dialProgress / 100) * 2 * Math.PI;
  const recent = [...d.sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 5);
  return (
    <div className="page study-page">
      <PageHeader
        eyebrow="A LITTLE UNDIVIDED ATTENTION"
        title="One thing at a time."
        description="Choose an idea. Give it some space."
      />
      <div className="study-layout">
        <section className="focus-paper">
          <div className="focus-label">
            <span
              className={`status-dot ${timer?.runningSince !== null && timer ? 'running' : ''}`}
            />
            {timer
              ? timer.runningSince !== null
                ? 'IN FOCUS'
                : 'A MOMENT TO PAUSE'
              : 'YOUR NEXT SESSION'}
          </div>
          {!timer ? (
            <div className="study-pickers">
              <label className="field">
                <span className="study-field-label">Topic</span>
                <Select
                  aria-label="Study topic"
                  value={activeTopic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setSubtopic('');
                  }}
                >
                  <option value="" disabled>
                    Choose a topic
                  </option>
                  {mainTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {d.subjects.find((s) => s.id === t.subjectId)?.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span className="study-field-label">
                  Subtopic <small>OPTIONAL</small>
                </span>
                <Select
                  aria-label="Study subtopic"
                  value={subtopic}
                  disabled={!children.length}
                  onChange={(e) => setSubtopic(e.target.value)}
                >
                  <option value="">
                    {children.length ? 'The whole topic' : 'No subtopics yet'}
                  </option>
                  {children.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span className="study-field-label">Focus length</span>
                <span className="study-duration-input">
                  <input
                    aria-label="Focus minutes"
                    type="number"
                    min="1"
                    max="240"
                    step="1"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    onBlur={() => {
                      if (minutes && !validMinutes)
                        setMinutes(
                          String(Math.max(1, Math.min(240, Math.round(focusMinutes) || 25))),
                        );
                    }}
                  />
                  <span>min</span>
                </span>
              </label>
            </div>
          ) : (
            <div className="focus-topic">
              <h2>{current?.name}</h2>
              {sub && (
                <p>
                  <span>↳</span> {sub.name}
                </p>
              )}
            </div>
          )}
          <div className={`timer-dial ${timer?.runningSince !== null && timer ? 'active' : ''}`}>
            <svg viewBox="0 0 320 320" aria-hidden="true">
              <circle className="dial-base" cx="160" cy="160" r="146" />
              <circle
                className="dial-progress"
                cx="160"
                cy="160"
                r="146"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - dialProgress}
              />
              <circle
                className="dial-center-mark"
                cx={160 + 146 * Math.cos(markerAngle)}
                cy={160 + 146 * Math.sin(markerAngle)}
                r="4"
              />
            </svg>
            <div className="timer-inner">
              <span className="timer-value" aria-label="Time remaining" role="timer">
                {duration(timeLeft, true)}
              </span>
              <span className="timer-caption">
                {timer
                  ? timer.runningSince === null
                    ? 'Paused · time remaining'
                    : 'Time remaining'
                  : `${validMinutes ? focusMinutes : '—'}-minute focus session`}
              </span>
            </div>
          </div>
          <div className="timer-actions">
            {timer ? (
              <>
                <Button variant="secondary" onClick={toggleTimer}>
                  {timer.runningSince !== null ? <Pause size={17} /> : <Play size={17} />}{' '}
                  {timer.runningSince !== null ? 'Pause' : 'Resume'}
                </Button>
                <Button onClick={() => finishTimer()}>
                  <Check size={17} />
                  Finish session
                </Button>
              </>
            ) : (
              <Button
                className="start-focus"
                disabled={!activeTopic || !validMinutes}
                onClick={() => startTimer(activeTopic, subtopic || null, focusMinutes)}
              >
                <Play size={17} />
                Begin focus
              </Button>
            )}
          </div>
          <p className="timer-key-hint">
            <kbd>Space</kbd> {timer ? 'pause or resume' : 'begin focus'}
          </p>
          {timer && (
            <label className="session-note">
              <span>Leave a little note for your future self</span>
              <textarea
                rows={2}
                placeholder="What clicked? What is still a question?"
                value={timer.note}
                onChange={(e) =>
                  mutate((d) => {
                    d.timer!.note = e.target.value;
                  })
                }
              />
            </label>
          )}
          {!d.topics.length && (
            <p className="hint">Add a topic in your Checklist to start studying.</p>
          )}
        </section>
        <aside className="study-aside">
          <div className="study-today">
            <span className="eyebrow">YOUR STUDY RHYTHM</span>
            <h2>{duration(stats.today)}</h2>
            <p>collected today</p>
            <div className="mini-rule" />
            <div>
              <span>This week</span>
              <strong>{duration(stats.thisWeek)}</strong>
            </div>
            <div>
              <span>Daily average · 7 days</span>
              <strong>{duration(stats.average7)}</strong>
            </div>
            <div>
              <span>Current streak</span>
              <strong>{stats.currentStreak} days</strong>
            </div>
          </div>
          <blockquote>
            “What I cannot create,
            <br />I do not understand.”<cite>RICHARD FEYNMAN</cite>
          </blockquote>
          <section>
            <SectionTitle aside={<Clock size={16} />}>Recent sessions</SectionTitle>
            {recent.length ? (
              recent.map((s) => (
                <div className="recent-session" key={s.id}>
                  <span>
                    <strong>{d.topics.find((t) => t.id === s.topicId)?.name}</strong>
                    <small>
                      {dateLabel(s.startedAt, { month: 'short', day: 'numeric' })}
                      {s.demo ? ' · demo' : ''}
                    </small>
                  </span>
                  <span>{duration(s.durationMs)}</span>
                </div>
              ))
            ) : (
              <Empty title="Time to begin">Your finished sessions will appear here.</Empty>
            )}
            <button className="text-button" onClick={() => navigate('history')}>
              Open study journal <ArrowRight size={15} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

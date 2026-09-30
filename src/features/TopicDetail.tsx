import { useState } from 'react';
import Markdown from 'react-markdown';
import { ArrowRight, Check, Clock, Link2, Plus, Trash2, X } from 'lucide-react';
import {
  chooseStudy,
  deleteTopic,
  mutate,
  navigate,
  selectTopic,
  setMastery,
  toast,
  updateTopic,
  useAtlas,
} from '../app/store';
import { masteryNames, uid, type Mastery } from '../lib/model';
import { dateLabel, duration } from '../lib/time';
import { canParent } from '../lib/map';
import {
  Button,
  Confirm,
  IconButton,
  MasterySquare,
  Modal,
  Select,
  SubjectLabel,
} from '../components/ui';
import { QuickAdd } from './Checklist';
export function TopicDetail() {
  const { data, selectedTopic } = useAtlas();
  const t = data!.topics.find((t) => t.id === selectedTopic);
  const [tab, setTab] = useState('understanding'),
    [preview, setPreview] = useState(false),
    [deleting, setDeleting] = useState(false),
    [child, setChild] = useState(false),
    [link, setLink] = useState(''),
    [kind, setKind] = useState<'prerequisite' | 'related'>('prerequisite');
  if (!t) return null;
  const children = data!.topics.filter((x) => x.parentId === t.id),
    sessions = data!.sessions
      .filter((s) => s.topicId === t.id || s.subtopicId === t.id)
      .sort((a, b) => b.startedAt - a.startedAt),
    tests = data!.tests.filter((x) => x.topicId === t.id).sort((a, b) => b.date - a.date);
  return (
    <Modal title="TOPIC NOTEBOOK" onClose={() => selectTopic(null)} className="topic-dialog" wide>
      <div className="topic-detail-heading">
        <SubjectLabel id={t.subjectId} />
        <input
          className="topic-title-input"
          aria-label="Topic name"
          value={t.name}
          maxLength={120}
          onChange={(e) => {
            if (e.target.value.trim()) updateTopic(t.id, { name: e.target.value });
          }}
        />
        <div className="topic-detail-sub">
          <span>
            <Clock size={14} />
            {duration(sessions.reduce((n, s) => n + s.durationMs, 0))} studied
          </span>
          <span>Created {dateLabel(t.createdAt)}</span>
        </div>
      </div>
      <div className="mastery-picker">
        {masteryNames.map((n, i) => (
          <button
            key={n}
            className={t.mastery === i ? 'selected' : ''}
            onClick={() => setMastery(t.id, i as Mastery)}
            aria-pressed={t.mastery === i}
          >
            <MasterySquare value={i as Mastery} size={20} />
            <span>{n}</span>
          </button>
        ))}
      </div>
      <div className="tab-strip">
        {['understanding', 'connections', 'activity'].map((n) => (
          <button key={n} className={tab === n ? 'active' : ''} onClick={() => setTab(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="detail-body">
        {tab === 'understanding' && (
          <>
            <div className="editor-toolbar">
              <span className="hint">Your words. Your understanding. Autosaved.</span>
              <button className="text-button" onClick={() => setPreview(!preview)}>
                {preview ? 'Edit notes' : 'Markdown preview'}
              </button>
            </div>
            {(['explanation', 'examples', 'notes'] as const).map((field, i) => (
              <section key={field} className="notebook-field">
                <label htmlFor={`topic-${field}`}>
                  {['My explanation', 'Examples', 'Notes & questions'][i]}
                </label>
                {preview ? (
                  <div className="markdown">
                    <Markdown
                      components={{
                        img: ({ alt }) => <span>[Image: {alt}]</span>,
                        a: ({ children }) => <span className="markdown-link">{children}</span>,
                      }}
                    >
                      {t[field] || '*An open space for your thoughts.*'}
                    </Markdown>
                  </div>
                ) : (
                  <textarea
                    id={`topic-${field}`}
                    rows={field === 'explanation' ? 6 : 3}
                    placeholder={
                      [
                        'How would you describe this in your own words?',
                        'A small example can make a big idea click.',
                        'What is still unclear? What would you like to explore?',
                      ][i]
                    }
                    value={t[field]}
                    onChange={(e) => updateTopic(t.id, { [field]: e.target.value })}
                  />
                )}
              </section>
            ))}
          </>
        )}
        {tab === 'connections' && (
          <>
            <label className="field">
              Subject
              <Select
                value={t.subjectId}
                onChange={(e) => updateTopic(t.id, { subjectId: e.target.value })}
              >
                {data!.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              Parent topic
              <Select
                value={t.parentId ?? ''}
                onChange={(e) => updateTopic(t.id, { parentId: e.target.value || null })}
              >
                <option value="">No parent · independent topic</option>
                {data!.topics
                  .filter((x) => x.id !== t.id && canParent(data!, t.id, x.id))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {data!.subjects.find((s) => s.id === x.subjectId)?.name}
                    </option>
                  ))}
              </Select>
            </label>
            <div className="section-heading">
              <h3>Subtopics</h3>
              <Button variant="secondary" onClick={() => setChild(true)}>
                <Plus size={14} />
                Add child
              </Button>
            </div>
            {children.length ? (
              children.map((c) => (
                <button className="connection-row" key={c.id} onClick={() => selectTopic(c.id)}>
                  <MasterySquare value={c.mastery} size={18} />
                  {c.name}
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <p className="hint">Follow a question deeper by adding a subtopic.</p>
            )}
            <div className="section-heading">
              <h3>Prerequisites & related ideas</h3>
              <Link2 size={17} />
            </div>
            {data!.relations
              .filter((r) => r.fromId === t.id)
              .map((r) => (
                <div className="connection-row" key={r.id}>
                  <button onClick={() => selectTopic(r.toId)}>
                    {data!.topics.find((t) => t.id === r.toId)?.name}
                  </button>
                  <span className="hint">{r.kind}</span>
                  <IconButton
                    label="Remove relationship"
                    onClick={() =>
                      mutate((d) => {
                        d.relations = d.relations.filter((x) => x.id !== r.id);
                      })
                    }
                  >
                    <X size={14} />
                  </IconButton>
                </div>
              ))}
            <div className="add-link">
              <Select
                aria-label="Relationship type"
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
              >
                <option value="prerequisite">Prerequisite</option>
                <option value="related">Related</option>
              </Select>
              <Select
                aria-label="Link topic"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              >
                <option value="">Choose an idea…</option>
                {data!.topics
                  .filter(
                    (x) =>
                      x.id !== t.id &&
                      !data!.relations.some(
                        (r) => r.fromId === t.id && r.toId === x.id && r.kind === kind,
                      ),
                  )
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} · {data!.subjects.find((s) => s.id === x.subjectId)?.name}
                    </option>
                  ))}
              </Select>
              <IconButton
                label="Add relationship"
                disabled={!link}
                onClick={() => {
                  mutate((d) => {
                    d.relations.push({ id: uid(), fromId: t.id, toId: link, kind, demo: false });
                  });
                  setLink('');
                }}
              >
                <Plus size={18} />
              </IconButton>
            </div>
          </>
        )}
        {tab === 'activity' && (
          <>
            <div className="detail-dates">
              <span>
                First understood
                <strong>{t.understoodAt ? dateLabel(t.understoodAt) : 'Still exploring'}</strong>
              </span>
              <span>
                Last tested
                <strong>{t.lastTestedAt ? dateLabel(t.lastTestedAt) : 'Not tested yet'}</strong>
              </span>
            </div>
            <h3>
              Retention history{' '}
              <span className="hint">
                {tests.filter((x) => x.result === 'pass').length} passed ·{' '}
                {tests.filter((x) => x.result === 'review').length} reviewed
              </span>
            </h3>
            {tests.length ? (
              tests.map((x) => (
                <div key={x.id} className="history-entry">
                  <span className={`test-result ${x.result}`}>
                    <Check size={15} />
                    {x.result === 'pass' ? 'Passed' : 'Needs review'}
                  </span>
                  <span className="hint">{dateLabel(x.date)}</span>
                  {x.response && <p>{x.response}</p>}
                </div>
              ))
            ) : (
              <p className="hint">Your first retention test will appear here.</p>
            )}
            <h3>Recent study sessions</h3>
            {sessions.length ? (
              sessions.slice(0, 15).map((s) => (
                <div key={s.id} className="history-entry">
                  <span>{dateLabel(s.startedAt)}</span>
                  <strong>{duration(s.durationMs)}</strong>
                  {s.note && <p>{s.note}</p>}
                </div>
              ))
            ) : (
              <p className="hint">No sessions yet. Make a little time for this idea.</p>
            )}
          </>
        )}
      </div>
      <footer className="detail-footer">
        <IconButton label="Delete topic" onClick={() => setDeleting(true)}>
          <Trash2 size={17} />
        </IconButton>
        <span className="hint">Changes are saved automatically</span>
        <Button
          onClick={() => {
            chooseStudy(t.id);
          }}
        >
          <Clock size={16} />
          Study this
        </Button>
      </footer>
      {child && <QuickAdd parentId={t.id} onClose={() => setChild(false)} />}{' '}
      {deleting && (
        <Confirm
          title={`Delete “${t.name}”?`}
          action="Delete topic"
          danger
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            try {
              deleteTopic(t.id);
            } catch (e) {
              toast(String((e as Error).message));
              setDeleting(false);
            }
          }}
        >
          <p>
            This removes the topic, its map cell, links, test history and{' '}
            {sessions.filter((s) => s.topicId === t.id).length} study sessions assigned to it.
            Subtopics are kept as independent topics.
          </p>
          <p>A backup in Settings can help you recover earlier work.</p>
        </Confirm>
      )}
    </Modal>
  );
}

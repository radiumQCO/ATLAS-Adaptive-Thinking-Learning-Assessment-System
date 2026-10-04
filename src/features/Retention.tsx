import { useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import { ArrowRight, Check, Download, RotateCcw } from 'lucide-react';
import { playFeedback, testTopic, toast, useAtlas } from '../app/store';
import { dateLabel, nextTestDay, parseDay } from '../lib/time';
import { createTestExport, testDays } from '../lib/test-export';
import { exportTextFile } from '../db/storage';
import { Button, Empty, MasterySquare, PageHeader, Select, SubjectLabel } from '../components/ui';
export function Retention() {
  const { data } = useAtlas(),
    d = data!,
    queue = d.topics.filter((t) => t.mastery === 2);
  const [selected, setSelected] = useState(''),
    [response, setResponse] = useState(''),
    [reveal, setReveal] = useState(false);
  const topic = queue.find((t) => t.id === selected) ?? queue[0];
  function decide(result: 'pass' | 'review') {
    testTopic(topic.id, result, response);
    setResponse('');
    setReveal(false);
    setSelected('');
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="KEEP WHAT YOU HAVE LEARNED"
        title="What stayed with you?"
        description={
          <>
            Your next review day is{' '}
            {dateLabel(nextTestDay(d.settings.testDay).getTime(), {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
            . You're welcome to revisit an idea anytime.
          </>
        }
      />
      {topic ? (
        <div className="retention-layout">
          <aside className="review-queue">
            <div className="list-caption">{queue.length} IDEAS TO REVISIT</div>
            {queue.map((t) => (
              <button
                className={t.id === topic.id ? 'active' : ''}
                key={t.id}
                onClick={() => {
                  setSelected(t.id);
                  setResponse('');
                  setReveal(false);
                }}
              >
                <MasterySquare value={2} size={18} />
                <span>{t.name}</span>
                <ArrowRight size={14} />
              </button>
            ))}
          </aside>
          <section className="review-paper" key={topic.id}>
            <SubjectLabel id={topic.subjectId} />
            <h2>{topic.name}</h2>
            <p className="review-intro">
              Put the idea back together, in whatever way works for you.
            </p>
            <ol className="review-prompts">
              <li>What is it?</li>
              <li>Why does it matter?</li>
              <li>Give a simple example.</li>
              <li>Try it in a tiny problem or sketch.</li>
            </ol>
            <label className="field">
              Your recall notes <span className="hint">optional</span>
              <textarea
                rows={4}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Words, a formula, a small example. This is just for you."
              />
            </label>
            <button className="text-button" onClick={() => setReveal(!reveal)}>
              {reveal ? 'Hide' : 'Look at'} my explanation
            </button>
            {reveal && (
              <div className="recall-explanation markdown">
                <Markdown
                  components={{
                    img: ({ alt }) => <span>[Image: {alt}]</span>,
                    a: ({ children }) => <span className="markdown-link">{children}</span>,
                  }}
                >
                  {topic.explanation || '*You have not written an explanation yet.*'}
                </Markdown>
              </div>
            )}
            <div className="review-decision">
              <p>
                You decide whether you understand.
                <br />
                <span>Fluent explanations are not a requirement.</span>
              </p>
              <div>
                <Button variant="secondary" onClick={() => decide('review')}>
                  <RotateCcw size={16} />
                  Needs review
                </Button>
                <Button onClick={() => decide('pass')}>
                  <Check size={17} />I understand · Pass
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <Empty title="A clear page. A little more understood.">
          No topics are waiting for a test. Mark a topic “Understood” when you are ready to revisit
          it.
        </Empty>
      )}
      <div className="retention-summary">
        <span>{d.tests.filter((t) => t.result === 'pass').length} passed tests</span>
        <span>{d.tests.filter((t) => t.result === 'review').length} chances to revisit</span>
        <span>Every test is saved in the topic's activity.</span>
      </div>
      <SavedTests />
    </div>
  );
}

function SavedTests() {
  const { data } = useAtlas();
  const d = data!;
  const days = useMemo(() => testDays(d.tests), [d.tests]);
  const names = useMemo(() => new Map(d.topics.map((t) => [t.id, t.name])), [d.topics]);
  const [selectedDay, setSelectedDay] = useState('');
  const [exporting, setExporting] = useState(false);
  const selected = days.find((entry) => entry.day === selectedDay) ?? days[0];
  async function download() {
    if (!selected || exporting) return;
    setExporting(true);
    try {
      const file = createTestExport(d, selected.day);
      if (await exportTextFile(file.body, file.filename)) {
        toast('Saved test answers exported');
        playFeedback('finish');
      }
    } catch (error) {
      toast(
        `Could not export test answers. ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <section className="saved-tests" aria-labelledby="saved-tests-heading">
      <div className="eyebrow">YOUR WORDS, KEPT OVER TIME</div>
      <h2 id="saved-tests-heading">Saved tests</h2>
      <p className="hint">
        Choose a test day and export the answers you wrote from memory. Share the text file with an
        AI to get feedback on what you remember.
      </p>
      {selected ? (
        <>
          <div className="test-export-controls">
            <label className="field">
              Test day
              <Select
                aria-label="Saved test day"
                value={selected.day}
                onChange={(event) => setSelectedDay(event.target.value)}
              >
                {days.map((entry, index) => (
                  <option key={entry.day} value={entry.day}>
                    {dateLabel(parseDay(entry.day).getTime(), {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {index === 0 ? ' · Latest' : ''} · {entry.tests.length}{' '}
                    {entry.tests.length === 1 ? 'answer' : 'answers'}
                  </option>
                ))}
              </Select>
            </label>
            <Button variant="secondary" disabled={exporting} onClick={() => void download()}>
              <Download size={16} />
              {exporting ? 'Exporting…' : 'Export .txt'}
            </Button>
          </div>
          <div className="saved-test-answers" key={selected.day}>
            {selected.tests.map((test) => (
              <details className="saved-test-answer" key={test.id}>
                <summary>
                  <strong>{names.get(test.topicId) ?? 'Unknown topic'}</strong>
                  <span>
                    {dateLabel(test.date, { hour: '2-digit', minute: '2-digit', hour12: false })}
                    {' · '}
                    {test.result === 'pass' ? 'Passed' : 'Needs review'}
                  </span>
                </summary>
                <p className={test.response.trim() ? '' : 'hint'}>
                  {test.response.trim()
                    ? test.response
                    : 'No recall notes were written for this test.'}
                </p>
              </details>
            ))}
          </div>
          <p className="hint test-export-note">
            Includes every saved attempt on this day, with its time and your self-assessment.
            Checklist explanations are not included.
          </p>
        </>
      ) : (
        <p className="hint test-export-note">
          After you save your first test result, its recall notes will appear here for export.
        </p>
      )}
    </section>
  );
}

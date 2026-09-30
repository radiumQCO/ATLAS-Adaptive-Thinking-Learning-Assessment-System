import { useState } from 'react';
import Markdown from 'react-markdown';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { testTopic, useAtlas } from '../app/store';
import { dateLabel, nextTestDay } from '../lib/time';
import { Button, Empty, MasterySquare, PageHeader, SubjectLabel } from '../components/ui';
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
    </div>
  );
}

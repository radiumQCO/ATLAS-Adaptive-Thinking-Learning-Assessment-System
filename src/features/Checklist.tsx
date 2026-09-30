import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react';
import {
  addTopic,
  deleteTopic,
  mutate,
  selectTopic,
  setAdding,
  setSearch,
  useAtlas,
} from '../app/store';
import { masteryNames, uid } from '../lib/model';
import {
  Button,
  Empty,
  IconButton,
  MasterySquare,
  Modal,
  PageHeader,
  Select,
  TopicRow,
} from '../components/ui';
export function QuickAdd({
  onClose,
  parentId = null,
}: {
  onClose: () => void;
  parentId?: string | null;
}) {
  const { data } = useAtlas();
  const [name, setName] = useState(''),
    [subject, setSubject] = useState(
      data!.topics.find((t) => t.id === parentId)?.subjectId ?? data!.subjects[0]?.id ?? '__new',
    ),
    [newSubject, setNewSubject] = useState('');
  return (
    <Modal title={parentId ? 'Add a subtopic' : 'A new piece of understanding'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          let subjectId = subject;
          if (subject === '__new' || !subject) {
            if (!newSubject.trim()) return;
            subjectId = uid();
            mutate((d) => {
              d.subjects.push({
                id: subjectId,
                name: newSubject.trim(),
                color: '#c55327',
                demo: false,
              });
            });
          }
          const id = addTopic(name, subjectId, parentId);
          onClose();
          selectTopic(id);
        }}
      >
        <label className="field">
          Topic name
          <input
            autoFocus
            required
            maxLength={120}
            placeholder="What would you like to understand?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          Subject
          <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {data!.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="__new">+ New subject</option>
          </Select>
        </label>
        {(subject === '__new' || !subject) && (
          <label className="field">
            New subject name
            <input
              required
              maxLength={120}
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. Philosophy"
            />
          </label>
        )}
        <div className="dialog-actions">
          <span className="hint">One idea. A whole new direction.</span>
          <Button type="submit">
            <Plus size={16} />
            Add topic
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Checklist() {
  const { data, search } = useAtlas();
  const [subject, setSubject] = useState('all'),
    [mastery, setFilter] = useState('all'),
    [sort, setSort] = useState('manual'),
    [page, setPage] = useState(0);
  const topics = useMemo(
    () =>
      data!.topics
        .filter(
          (t) =>
            (subject === 'all' || t.subjectId === subject) &&
            (mastery === 'all' || t.mastery === +mastery) &&
            t.name.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === 'name'
            ? a.name.localeCompare(b.name)
            : sort === 'mastery'
              ? a.mastery - b.mastery || a.order - b.order
              : sort === 'newest'
                ? b.createdAt - a.createdAt
                : a.order - b.order,
        ),
    [data, search, subject, mastery, sort],
  );
  const offset = Math.min(page, Math.max(0, Math.ceil(topics.length / 60) - 1)) * 60;
  function reorder(id: string, dir: number) {
    const index = topics.findIndex((t) => t.id === id),
      other = topics[index + dir];
    if (!other) return;
    mutate((d) => {
      const a = d.topics.find((t) => t.id === id)!,
        b = d.topics.find((t) => t.id === other.id)!;
      [a.order, b.order] = [b.order, a.order];
    });
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="THE MASTER LIST"
        title="Every idea starts here."
        description="All your subjects. One growing notebook."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={17} />
            Add topic <kbd>⌃ N</kbd>
          </Button>
        }
      />
      <div className="list-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search topics"
            placeholder="Find a topic…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select
          aria-label="Filter by subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All subjects</option>
          {data!.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by mastery"
          value={mastery}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">All stages</option>
          {masteryNames.map((s, i) => (
            <option key={s} value={i}>
              {s}
            </option>
          ))}
        </Select>
        <Select aria-label="Sort topics" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="manual">Manual order</option>
          <option value="name">Alphabetical</option>
          <option value="mastery">Mastery stage</option>
          <option value="newest">Newest first</option>
        </Select>
      </div>
      <div className="paper-list">
        <div className="list-caption">
          <span>{topics.length} TOPICS</span>
          <span>SUBJECT</span>
        </div>
        {topics.length ? (
          topics.slice(offset, offset + 60).map((t, i) => (
            <TopicRow
              key={t.id}
              topic={t}
              extra={
                <div className="reorder">
                  {sort === 'manual' && (
                    <>
                      <IconButton
                        label={`Move ${t.name} up`}
                        disabled={offset + i === 0}
                        onClick={() => reorder(t.id, -1)}
                      >
                        <ArrowUp size={13} />
                      </IconButton>
                      <IconButton
                        label={`Move ${t.name} down`}
                        disabled={offset + i === topics.length - 1}
                        onClick={() => reorder(t.id, 1)}
                      >
                        <ArrowDown size={13} />
                      </IconButton>
                    </>
                  )}
                  <IconButton
                    label={`Delete ${t.name}`}
                    disabled={data!.timer?.topicId === t.id || data!.timer?.subtopicId === t.id}
                    onClick={() => deleteTopic(t.id)}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              }
            />
          ))
        ) : (
          <Empty
            title={data!.topics.length ? 'No matching ideas' : 'Your first blank page'}
            action={
              !data!.topics.length ? (
                <Button onClick={() => setAdding(true)}>Add your first topic</Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setSubject('all');
                    setFilter('all');
                  }}
                >
                  Reset filters
                </Button>
              )
            }
          >
            {data!.topics.length
              ? 'Try another search or clear the filters.'
              : 'Add something you want to understand. You can follow the questions from there.'}
          </Empty>
        )}
      </div>
      {topics.length > 60 && (
        <div className="pagination">
          <Button variant="secondary" disabled={!offset} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + 60, topics.length)} of {topics.length}
          </span>
          <Button
            variant="secondary"
            disabled={offset + 60 >= topics.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
      <div className="mastery-legend">
        {masteryNames.map((n, i) => (
          <span key={n}>
            <MasterySquare value={i as 0 | 1 | 2 | 3} size={14} />
            {n}
          </span>
        ))}
        <span className="legend-note">Click a square to change its stage</span>
      </div>
    </div>
  );
}

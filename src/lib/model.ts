import { z } from 'zod';
import { CivilizationSchema, defaultCivilization } from './civilization';
const id = z.string().min(1).max(100);
const name = z.string().trim().min(1).max(120);
const time = z.number().int().nonnegative().max(8640000000000000);
const text = z.string().max(500000);
const base = { id, demo: z.boolean() };
export const SubjectSchema = z.object({
  ...base,
  name,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export const CountrySchema = SubjectSchema;
export const TopicSchema = z.object({
  ...base,
  name,
  subjectId: id,
  mastery: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  explanation: text,
  examples: text,
  notes: text,
  parentId: id.nullable(),
  createdAt: time,
  understoodAt: time.nullable(),
  lastTestedAt: time.nullable(),
  order: z.number().finite(),
});
export const NodeSchema = z.object({
  ...base,
  topicId: id,
  x: z.number().int().min(-100000).max(100000),
  y: z.number().int().min(-100000).max(100000),
  countryId: id.nullable(),
});
export const RelationSchema = z.object({
  ...base,
  fromId: id,
  toId: id,
  kind: z.enum(['prerequisite', 'related']),
});
const SegmentSchema = z
  .object({ start: time, end: time })
  .refine((s) => s.end >= s.start, 'A time segment ends before it starts.');
export const SessionSchema = z.object({
  ...base,
  topicId: id,
  subtopicId: id.nullable(),
  startedAt: time,
  endedAt: time,
  durationMs: time,
  segments: z.array(SegmentSchema).max(100000),
  note: text,
});
export const TestSchema = z.object({
  ...base,
  topicId: id,
  date: time,
  result: z.enum(['pass', 'review']),
  response: text,
});
export const TimerSchema = z.object({
  id: z.literal('active'),
  topicId: id,
  subtopicId: id.nullable(),
  targetMs: z
    .number()
    .int()
    .min(60_000)
    .max(24 * 60 * 60_000)
    .default(25 * 60_000),
  startedAt: time,
  runningSince: time.nullable(),
  segments: z.array(SegmentSchema),
  note: text,
});
export const SettingsSchema = z.object({
  id: z.literal('preferences'),
  theme: z.enum(['light', 'dark', 'system']),
  motion: z.enum(['full', 'reduced']),
  grid: z.boolean(),
  gridIntensity: z.number().min(0).max(1),
  soundEffects: z.boolean().default(true),
  soundVolume: z.number().min(0).max(1).default(0.35),
  automaticBackups: z.boolean().default(true),
  testDay: z.number().int().min(0).max(6),
  dailyGoal: z.number().min(0).max(1440),
  createdAt: time,
  demoCleared: z.boolean(),
});
export const SnapshotSchema = z.object({
  schemaVersion: z.literal(2),
  revision: z.number().int().nonnegative(),
  subjects: z.array(SubjectSchema).max(10000),
  countries: z.array(CountrySchema).max(10000),
  topics: z.array(TopicSchema).max(100000),
  nodes: z.array(NodeSchema).max(100000),
  relations: z.array(RelationSchema).max(100000),
  sessions: z.array(SessionSchema).max(1000000),
  tests: z.array(TestSchema).max(1000000),
  settings: SettingsSchema,
  timer: TimerSchema.nullable(),
  civilization: CivilizationSchema,
});
export type Subject = z.infer<typeof SubjectSchema>;
export type Country = z.infer<typeof CountrySchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Mastery = Topic['mastery'];
export type MapNode = z.infer<typeof NodeSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type StudySession = z.infer<typeof SessionSchema>;
export type RetentionTest = z.infer<typeof TestSchema>;
export type ActiveTimer = z.infer<typeof TimerSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export const collectionNames = [
  'subjects',
  'countries',
  'topics',
  'nodes',
  'relations',
  'sessions',
  'tests',
] as const;
export type Collection = (typeof collectionNames)[number];
export const masteryNames = ['Not started', 'Learning', 'Understood', 'Passed'] as const;
export const uid = () => crypto.randomUUID();
export const defaultSettings = (): Settings => ({
  id: 'preferences',
  theme: 'light',
  motion: 'full',
  grid: true,
  gridIntensity: 0.45,
  soundEffects: true,
  soundVolume: 0.35,
  automaticBackups: true,
  testDay: 0,
  dailyGoal: 120,
  createdAt: Date.now(),
  demoCleared: false,
});
export function emptySnapshot(): Snapshot {
  return {
    schemaVersion: 2,
    revision: 0,
    subjects: [],
    countries: [],
    topics: [],
    nodes: [],
    relations: [],
    sessions: [],
    tests: [],
    settings: defaultSettings(),
    timer: null,
    civilization: defaultCivilization(),
  };
}
export function validateSnapshot(input: unknown): Snapshot {
  const raw = input as Record<string, unknown> | null;
  const migrated =
    raw?.schemaVersion === 1
      ? { ...raw, schemaVersion: 2, civilization: raw.civilization ?? defaultCivilization() }
      : raw;
  const data = SnapshotSchema.parse(migrated);
  const builtins = defaultCivilization();
  const systemIds = new Set(data.civilization.systems.map((system) => system.id));
  for (const system of builtins.systems)
    if (!systemIds.has(system.id)) data.civilization.systems.push(system);
  const projectIds = new Set(data.civilization.projects.map((project) => project.id));
  for (const project of builtins.projects)
    if (!projectIds.has(project.id)) data.civilization.projects.push(project);
  for (const key of collectionNames) {
    const ids = data[key].map((x) => x.id);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate IDs in ${key}.`);
  }
  const subjects = new Set(data.subjects.map((x) => x.id)),
    countries = new Set(data.countries.map((x) => x.id));
  const topics = new Map(data.topics.map((t) => [t.id, t]));
  const requireTopic = (v: string | null) => {
    if (v && !topics.has(v)) throw new Error('A topic reference is missing.');
  };
  for (const t of data.topics) {
    if (!subjects.has(t.subjectId)) throw new Error('A subject reference is missing.');
    requireTopic(t.parentId);
    const path = new Set([t.id]);
    let p = t.parentId;
    while (p) {
      if (path.has(p)) throw new Error('A parent relationship contains a cycle.');
      path.add(p);
      p = topics.get(p)!.parentId;
    }
  }
  const cells = new Set<string>(),
    mapped = new Set<string>();
  for (const n of data.nodes) {
    requireTopic(n.topicId);
    if (n.countryId && !countries.has(n.countryId))
      throw new Error('A territory reference is missing.');
    const cell = `${n.x},${n.y}`;
    if (cells.has(cell) || mapped.has(n.topicId)) throw new Error('Duplicate map cells or topics.');
    cells.add(cell);
    mapped.add(n.topicId);
  }
  const relationKeys = new Set<string>();
  for (const r of data.relations) {
    requireTopic(r.fromId);
    requireTopic(r.toId);
    if (r.fromId === r.toId) throw new Error('A topic cannot link to itself.');
    const key = JSON.stringify([r.fromId, r.toId, r.kind]);
    if (relationKeys.has(key)) throw new Error('Duplicate topic relationship.');
    relationKeys.add(key);
  }
  for (const s of data.sessions) {
    requireTopic(s.topicId);
    requireTopic(s.subtopicId);
    if (s.endedAt < s.startedAt) throw new Error('Invalid session dates.');
    let last = s.startedAt;
    for (const segment of s.segments) {
      if (segment.start < last || segment.end > s.endedAt)
        throw new Error('Invalid session segments.');
      last = segment.end;
    }
    if (Math.abs(s.segments.reduce((a, b) => a + b.end - b.start, 0) - s.durationMs) > 1)
      throw new Error('Session duration does not match its segments.');
  }
  for (const t of data.tests) requireTopic(t.topicId);
  if (data.timer) {
    requireTopic(data.timer.topicId);
    requireTopic(data.timer.subtopicId);
    let end = data.timer.startedAt;
    for (const seg of data.timer.segments) {
      if (seg.start < end) throw new Error('Invalid timer segments.');
      end = seg.end;
    }
    if (data.timer.runningSince !== null && data.timer.runningSince < end)
      throw new Error('Invalid running timestamp.');
  }
  const systems = new Set(data.civilization.systems.map((s) => s.id));
  if (systems.size !== data.civilization.systems.length)
    throw new Error('Duplicate civilization system.');
  for (const system of data.civilization.systems) {
    const requirements = system.requirements.map((r) => r.id);
    if (new Set(requirements).size !== requirements.length)
      throw new Error('Duplicate knowledge requirement.');
  }
  for (const project of data.civilization.projects)
    if (project.systemIds.some((id) => !systems.has(id)))
      throw new Error('A project references a missing system.');
  return data;
}

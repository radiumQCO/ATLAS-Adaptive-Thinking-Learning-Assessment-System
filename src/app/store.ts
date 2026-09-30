import { useSyncExternalStore } from 'react';
import { canParent } from '../lib/map';
import {
  uid,
  emptySnapshot,
  validateSnapshot,
  type Snapshot,
  type Topic,
  type Mastery,
  type ActiveTimer,
  type Settings,
} from '../lib/model';
import { elapsed, getStats, remaining } from '../lib/time';
import { playSound, type SoundCue } from '../lib/sound';
import { defaultCivilization } from '../lib/civilization';
import * as storage from '../db/storage';
export type Page =
  'home' | 'checklist' | 'map' | 'study' | 'history' | 'tests' | 'civilization' | 'settings';
interface State {
  data: Snapshot | null;
  page: Page;
  selectedTopic: string | null;
  adding: boolean;
  search: string;
  studyTopic: string | null;
  toast: { message: string; record?: boolean } | null;
  saveState: 'saved' | 'saving' | 'error';
  error: string | null;
  timerFinished: { topic: string; minutes: number } | null;
}
let state: State = {
  data: null,
  page: 'home',
  selectedTopic: null,
  adding: false,
  search: '',
  studyTopic: null,
  toast: null,
  saveState: 'saved',
  error: null,
  timerFinished: null,
};
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
};
export function useAtlas() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}
export const getState = () => state;
export function playFeedback(cue: SoundCue) {
  const settings = state.data?.settings;
  if (settings) playSound(cue, settings.soundEffects, settings.soundVolume);
}
let persistedRevision = 0,
  queue = Promise.resolve(),
  init: Promise<void> | null = null,
  toastTimer: ReturnType<typeof setTimeout>,
  failure: unknown = null;
let lastAutoBackupAt = 0;
let lastAutoBackupRevision = 0;
let autoBackupRunning = false;
const AUTO_BACKUP_INTERVAL = 6 * 60 * 60 * 1000;
function persist(data: Snapshot) {
  emit({ saveState: 'saving' });
  queue = queue
    .then(async () => {
      if (failure) throw failure;
      persistedRevision = await storage.saveData(data, persistedRevision);
    })
    .catch((e) => {
      failure = e;
      emit({ error: String(e instanceof Error ? e.message : e), saveState: 'error' });
    });
  const current = queue;
  void current.then(() => {
    if (current === queue && !failure) emit({ saveState: 'saved' });
  });
}
export async function flush() {
  await queue;
  if (failure) throw failure;
}
export function mutate(fn: (draft: Snapshot) => void) {
  if (!state.data) return;
  const draft = structuredClone(state.data);
  fn(draft);
  draft.revision++;
  emit({ data: draft });
  persist(draft);
}
export function toast(message: string, record = false) {
  clearTimeout(toastTimer);
  emit({ toast: { message, record } });
  toastTimer = setTimeout(() => emit({ toast: null }), record ? 6000 : 3500);
}
export const navigate = (page: Page) => emit({ page });
export const selectTopic = (selectedTopic: string | null) => emit({ selectedTopic });
export const setAdding = (adding: boolean) => emit({ adding });
export const chooseStudy = (id: string) =>
  emit({ studyTopic: id, page: 'study', selectedTopic: null });
export const setSearch = (search: string) => emit({ search });
export const dismissTimerFinished = () => emit({ timerFinished: null });
export function initialize() {
  if (init) return init;
  init = (async () => {
    try {
      try {
        for (let index = localStorage.length - 1; index >= 0; index--) {
          const key = localStorage.key(index);
          if (key?.startsWith('atlas-cloud-')) localStorage.removeItem(key);
        }
      } catch {
        // The local notebook works even if browser storage is unavailable.
      }
      const saved = await storage.loadData();
      const data = saved ? validateSnapshot(saved) : emptySnapshot();
      if (!saved) data.revision = 1;
      persistedRevision = saved?.revision ?? 0;
      emit({ data });
      if (!saved) {
        persist(data);
        await flush();
      }
      if (data.settings.automaticBackups) {
        try {
          const backups = await storage.listBackups();
          lastAutoBackupAt = backups[0]?.createdAt ?? Date.now();
          lastAutoBackupRevision = data.revision;
          if (
            !backups.length &&
            (data.topics.length || data.sessions.length || data.nodes.length)
          ) {
            await storage.createBackup(data, 'Automatic');
            lastAutoBackupAt = Date.now();
          }
        } catch (e) {
          toast(`Backup check failed: ${String(e)}`);
        }
      }
      if (!storage.native) void navigator.storage?.persist?.().catch(() => undefined);
      setInterval(() => {
        // Saving a change is immediate; a backup is a separate, occasional safety copy.
        const data = state.data;
        if (
          !data?.settings.automaticBackups ||
          failure ||
          autoBackupRunning ||
          data.revision === lastAutoBackupRevision ||
          Date.now() - lastAutoBackupAt < AUTO_BACKUP_INTERVAL
        )
          return;
        autoBackupRunning = true;
        void flush()
          .then(async () => {
            const current = state.data;
            if (!current?.settings.automaticBackups) return;
            await storage.createBackup(current, 'Automatic');
            lastAutoBackupAt = Date.now();
            lastAutoBackupRevision = current.revision;
          })
          .catch((e) => toast(`Backup failed: ${String(e)}`))
          .finally(() => {
            autoBackupRunning = false;
          });
      }, 15 * 60000);
    } catch (e) {
      emit({ error: String(e instanceof Error ? e.message : e), saveState: 'error' });
      init = null;
    }
  })();
  return init;
}
export function addTopic(name: string, subjectId: string, parentId: string | null = null) {
  const id = uid();
  mutate((d) => {
    d.topics.push({
      id,
      name: name.trim(),
      subjectId,
      parentId,
      mastery: 0,
      explanation: '',
      examples: '',
      notes: '',
      createdAt: Date.now(),
      understoodAt: null,
      lastTestedAt: null,
      order: d.topics.reduce((max, t) => Math.max(max, t.order), -1) + 1,
      demo: false,
    });
  });
  toast('Topic added to your notebook');
  playFeedback('add');
  return id;
}
export function updateTopic(id: string, patch: Partial<Topic>) {
  mutate((d) => {
    const t = d.topics.find((t) => t.id === id);
    if (!t) return;
    if (patch.parentId !== undefined && !canParent(d, id, patch.parentId))
      throw new Error('A topic cannot be its own ancestor.');
    Object.assign(t, patch, { id: t.id, demo: false });
  });
}
export function setMastery(id: string, mastery: Mastery) {
  const before = state.data?.topics.find((t) => t.id === id)?.mastery;
  mutate((d) => {
    const t = d.topics.find((t) => t.id === id);
    if (t) {
      t.mastery = mastery;
      t.demo = false;
      if (mastery >= 2 && !t.understoodAt) t.understoodAt = Date.now();
    }
  });
  if (before !== undefined && before !== mastery) playFeedback(mastery === 3 ? 'pass' : 'mastery');
}
export function deleteTopic(id: string) {
  mutate((d) => {
    if (d.timer && (d.timer.topicId === id || d.timer.subtopicId === id))
      throw new Error('Finish the active study session before deleting this topic.');
    d.topics = d.topics
      .filter((t) => t.id !== id)
      .map((t) => (t.parentId === id ? { ...t, parentId: null } : t));
    d.nodes = d.nodes.filter((n) => n.topicId !== id);
    d.relations = d.relations.filter((r) => r.fromId !== id && r.toId !== id);
    d.sessions = d.sessions
      .filter((s) => s.topicId !== id)
      .map((s) => (s.subtopicId === id ? { ...s, subtopicId: null } : s));
    d.tests = d.tests.filter((t) => t.topicId !== id);
    for (const system of d.civilization.systems)
      for (const req of system.requirements)
        req.topicIds = req.topicIds.filter((linked) => linked !== id);
  });
  selectTopic(null);
  toast('Topic deleted');
}
export const updateSettings = (patch: Partial<Settings>) =>
  mutate((d) => {
    Object.assign(d.settings, patch);
  });
export function startTimer(topicId: string, subtopicId: string | null, minutes = 25) {
  if (state.data?.timer) return;
  const targetMs = Math.max(1, Math.min(240, Math.round(minutes))) * 60_000;
  mutate((d) => {
    const now = Date.now();
    d.timer = {
      id: 'active',
      topicId,
      subtopicId,
      targetMs,
      startedAt: now,
      runningSince: now,
      segments: [],
      note: '',
    };
  });
  toast('A little focus goes a long way');
  playFeedback('start');
}
export function toggleTimer() {
  if (
    state.data?.timer &&
    state.data.timer.runningSince !== null &&
    remaining(state.data.timer) === 0
  ) {
    completeTimerIfDue();
    return;
  }
  const cue = state.data?.timer?.runningSince == null ? 'start' : 'pause';
  mutate((d) => {
    const t = d.timer;
    if (!t) return;
    const now = Date.now();
    if (t.runningSince !== null) {
      t.segments.push({ start: t.runningSince, end: Math.max(t.runningSince, now) });
      t.runningSince = null;
    } else t.runningSince = Math.max(now, t.segments.at(-1)?.end ?? t.startedAt);
  });
  playFeedback(cue);
}
export function completeTimerIfDue(now = Date.now()) {
  const timer = state.data?.timer;
  if (!timer || timer.runningSince === null || remaining(timer, now) > 0) return;
  const recorded = timer.segments.reduce((total, s) => total + s.end - s.start, 0);
  // Use the exact deadline for the journal, even if the app wakes up a little late.
  finishTimer(true, timer.runningSince + Math.max(0, timer.targetMs - recorded));
}
export function finishTimer(completed = false, endedAt = Date.now()) {
  if (!state.data?.timer) return;
  const finishedTopic =
    state.data.topics.find((topic) => topic.id === state.data?.timer?.topicId)?.name ??
    'Your topic';
  const finishedMinutes = Math.round(state.data.timer.targetMs / 60_000);
  const old = getStats(state.data.sessions);
  const ms = elapsed(state.data.timer, endedAt);
  mutate((d) => {
    const t = d.timer!;
    if (t.runningSince !== null)
      t.segments.push({ start: t.runningSince, end: Math.max(t.runningSince, endedAt) });
    d.sessions.push({
      id: uid(),
      topicId: t.topicId,
      subtopicId: t.subtopicId,
      startedAt: t.startedAt,
      endedAt: Math.max(endedAt, t.segments.at(-1)?.end ?? endedAt),
      durationMs: t.segments.reduce((a, s) => a + s.end - s.start, 0),
      segments: t.segments,
      note: t.note,
      demo: false,
    });
    d.timer = null;
  });
  if (completed) {
    emit({ timerFinished: { topic: finishedTopic, minutes: finishedMinutes } });
    playFeedback('complete');
  }
  const stats = getStats(state.data!.sessions);
  const record = stats.longestSession > old.longestSession || stats.longestDay > old.longestDay;
  toast(
    record
      ? 'A new personal study record. Beautiful work.'
      : `Session saved · ${Math.floor(ms / 60000)} minutes of progress`,
    record,
  );
  if (!completed) playFeedback(record ? 'pass' : 'finish');
}
export function testTopic(id: string, result: 'pass' | 'review', response: string) {
  mutate((d) => {
    const t = d.topics.find((t) => t.id === id);
    if (!t) return;
    const date = Date.now();
    t.mastery = result === 'pass' ? 3 : 1;
    t.lastTestedAt = date;
    t.demo = false;
    d.tests.push({ id: uid(), topicId: id, date, result, response, demo: false });
  });
  toast(
    result === 'pass'
      ? 'Knowledge that stayed. Topic passed.'
      : 'Back to learning. Every review is progress.',
  );
  playFeedback(result === 'pass' ? 'pass' : 'mastery');
}
export async function backup(label = 'Manual') {
  await flush();
  if (!state.data) throw new Error('No notebook loaded.');
  const result = await storage.createBackup(state.data, label);
  lastAutoBackupAt = result.createdAt;
  lastAutoBackupRevision = state.data.revision;
  return result;
}
export async function restore(b: storage.Envelope) {
  await backup('Before restore');
  const next = validateSnapshot(b.snapshot);
  if (next.timer?.runningSince !== null && next.timer) {
    next.timer.segments.push({
      start: next.timer.runningSince!,
      end: Math.max(next.timer.runningSince!, b.createdAt),
    });
    next.timer.runningSince = null;
  }
  next.revision = persistedRevision + 1;
  emit({ data: next, selectedTopic: null });
  persist(next);
  await flush();
  toast('Notebook restored. Any active timer is paused.');
}
export async function clearDemo() {
  await backup('Before clearing demo');
  mutate((d) => {
    const keep = new Set(d.topics.filter((t) => !t.demo).map((t) => t.id));
    if (d.timer) {
      keep.add(d.timer.topicId);
      if (d.timer.subtopicId) keep.add(d.timer.subtopicId);
    }
    for (const s of d.sessions.filter((s) => !s.demo)) {
      keep.add(s.topicId);
      if (s.subtopicId) keep.add(s.subtopicId);
    }
    for (const t of d.tests.filter((t) => !t.demo)) keep.add(t.topicId);
    d.topics = d.topics
      .filter((t) => keep.has(t.id))
      .map((t) => ({
        ...t,
        parentId: t.parentId && keep.has(t.parentId) ? t.parentId : null,
        demo: false,
      }));
    d.nodes = d.nodes.filter((n) => !n.demo && keep.has(n.topicId));
    d.relations = d.relations.filter((r) => keep.has(r.fromId) && keep.has(r.toId));
    d.sessions = d.sessions.filter((s) => !s.demo);
    d.tests = d.tests.filter((t) => !t.demo);
    for (const system of d.civilization.systems)
      for (const req of system.requirements)
        req.topicIds = req.topicIds.filter((id) => keep.has(id));
    d.countries = d.countries.filter((c) => !c.demo || d.nodes.some((n) => n.countryId === c.id));
    d.subjects = d.subjects
      .filter((s) => !s.demo || d.topics.some((t) => t.subjectId === s.id))
      .map((s) => ({ ...s, demo: false }));
    d.settings.demoCleared = true;
  });
  await flush();
  toast('A fresh page. Your own work is safely kept.');
}
export function retrySave() {
  failure = null;
  emit({ error: null });
  if (state.data) persist(state.data);
}
export async function resetCivilization() {
  await backup('Before resetting Civilization');
  mutate((d) => {
    d.civilization = defaultCivilization();
  });
  await flush();
  toast('Civilization reset. Your learning is untouched.');
}
export async function resetAll() {
  await flush();
  const next = emptySnapshot();
  next.revision = persistedRevision + 1;
  emit({
    data: next,
    page: 'home',
    selectedTopic: null,
    studyTopic: null,
    adding: false,
    search: '',
    timerFinished: null,
  });
  persist(next);
  await flush();
  await storage.clearBackups();
  lastAutoBackupAt = Date.now();
  lastAutoBackupRevision = next.revision;
  toast('ATLAS has been reset to a fresh notebook.');
}

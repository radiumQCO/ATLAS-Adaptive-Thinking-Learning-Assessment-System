import Dexie, { type Table } from 'dexie';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { collectionNames, emptySnapshot, validateSnapshot, type Snapshot } from '../lib/model';
export interface Backup {
  id: string;
  createdAt: number;
  label: string;
}
export interface Envelope {
  format: 'atlas-backup';
  version: 1;
  createdAt: number;
  snapshot: Snapshot;
  checksum: string;
}
class AtlasDatabase extends Dexie {
  constructor() {
    super('atlas-notebook');
    this.version(1).stores({
      subjects: 'id',
      countries: 'id',
      topics: 'id,subjectId,mastery,parentId',
      nodes: 'id,&topicId,countryId',
      relations: 'id,fromId,toId',
      sessions: 'id,topicId,startedAt',
      tests: 'id,topicId,date',
      settings: 'id',
      timer: 'id',
      meta: 'id',
      backups: 'id,createdAt',
    });
    this.version(2).stores({ civilization: 'id' });
  }
}
export const browserDatabase = new AtlasDatabase();
export const native = isTauri();
const table = (name: string): Table => browserDatabase.table(name);
const runTransaction = browserDatabase.transaction.bind(browserDatabase) as unknown as <T>(
  mode: 'r' | 'rw',
  tables: Table[],
  work: () => Promise<T>,
) => Promise<T>;
export async function loadData(): Promise<Snapshot | null> {
  if (native) return invoke('load_data');
  return runTransaction(
    'r',
    browserDatabase.tables.filter((t) => t.name !== 'backups'),
    async () => {
      const meta = await table('meta').get('state');
      if (!meta) return null;
      const data = emptySnapshot();
      for (const key of collectionNames) (data[key] as unknown[]) = await table(key).toArray();
      data.settings = await table('settings').get('preferences');
      data.timer = (await table('timer').get('active')) ?? null;
      data.civilization = (await table('civilization').get('civilization')) ?? data.civilization;
      data.revision = meta.revision;
      return validateSnapshot(data);
    },
  );
}
export async function saveData(data: Snapshot, expectedRevision: number): Promise<number> {
  validateSnapshot(data);
  if (native) return invoke('save_data', { snapshot: data, expectedRevision });
  return runTransaction(
    'rw',
    browserDatabase.tables.filter((t) => t.name !== 'backups'),
    async () => {
      const meta = await table('meta').get('state');
      if ((meta?.revision ?? 0) !== expectedRevision)
        throw new Error(
          'ATLAS was changed in another window. Export your unsaved work, then reload this window.',
        );
      for (const key of collectionNames) {
        const rows = data[key];
        const ids = new Set(rows.map((x) => x.id));
        const previous = await table(key).toArray();
        const prev = new Map(previous.map((x) => [x.id, JSON.stringify(x)]));
        const removed = previous.filter((x) => !ids.has(x.id)).map((x) => x.id);
        if (removed.length) await table(key).bulkDelete(removed);
        const changed = rows.filter((x) => prev.get(x.id) !== JSON.stringify(x));
        if (changed.length) await table(key).bulkPut(changed);
      }
      await table('settings').put(data.settings);
      await table('civilization').put(data.civilization);
      if (data.timer) await table('timer').put(data.timer);
      else await table('timer').clear();
      await table('meta').put({ id: 'state', revision: expectedRevision + 1, schemaVersion: 1 });
      return expectedRevision + 1;
    },
  );
}
async function hash(text: string) {
  // This catches a damaged export before import. It is a checksum, not encryption.
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
}
export async function envelope(snapshot: Snapshot): Promise<Envelope> {
  return {
    format: 'atlas-backup',
    version: 1,
    createdAt: Date.now(),
    snapshot,
    checksum: await hash(JSON.stringify(snapshot)),
  };
}
export async function decodeBackup(text: string): Promise<Envelope> {
  if (text.length > 100 * 1024 * 1024) throw new Error('The backup exceeds the 100 MB limit.');
  const b = JSON.parse(text);
  if (b?.format !== 'atlas-backup' || b.version !== 1 || !Number.isSafeInteger(b.createdAt))
    throw new Error('This is not a supported ATLAS backup.');
  if ((await hash(JSON.stringify(b.snapshot))) !== b.checksum)
    throw new Error('The backup checksum does not match. No data was changed.');
  const snapshot = validateSnapshot(b.snapshot);
  return { ...b, snapshot };
}
export async function createBackup(data: Snapshot, label: string): Promise<Backup> {
  const b = await envelope(data);
  const entry = { id: `${b.createdAt}-${crypto.randomUUID()}`, createdAt: b.createdAt, label };
  if (native) await invoke('create_backup', { id: entry.id, label, contents: JSON.stringify(b) });
  else
    await runTransaction('rw', [table('backups')], async () => {
      await table('backups').put({ ...entry, contents: JSON.stringify(b) });
      const rows = await table('backups').orderBy('createdAt').reverse().toArray();
      if (rows.length > 12) await table('backups').bulkDelete(rows.slice(12).map((x) => x.id));
    });
  return entry;
}
export async function listBackups(): Promise<Backup[]> {
  if (native) return invoke('list_backups');
  return (await table('backups').orderBy('createdAt').reverse().toArray()).map(
    ({ id, createdAt, label }) => ({ id, createdAt, label }),
  );
}
export async function clearBackups(): Promise<void> {
  if (native) await invoke('clear_backups');
  else await table('backups').clear();
}
export async function readBackup(id: string): Promise<Envelope> {
  const text = native
    ? await invoke<string>('read_backup', { id })
    : (await table('backups').get(id))?.contents;
  if (!text) throw new Error('Backup not found.');
  return decodeBackup(text);
}
export async function exportFile(snapshot: Snapshot) {
  const body = JSON.stringify(await envelope(snapshot), null, 2);
  const filename = `ATLAS-${new Date().toISOString().slice(0, 10)}.json`;
  return saveExport(body, filename, 'ATLAS backup', 'json', 'application/json');
}
export async function exportTextFile(body: string, filename: string) {
  // The UTF-8 marker keeps Russian notes readable in Windows text editors too.
  return saveExport(`\uFEFF${body}`, filename, 'Text document', 'txt', 'text/plain;charset=utf-8');
}
async function saveExport(
  body: string,
  filename: string,
  label: string,
  extension: string,
  mime: string,
) {
  if (native) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({
      defaultPath: filename,
      filters: [{ name: label, extensions: [extension] }],
    });
    if (!path) return false;
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(path, body);
  } else {
    const url = URL.createObjectURL(new Blob([body], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  return true;
}

import { useEffect, useState } from 'react';
import { Download, HardDriveDownload, RotateCcw, Trash2, Upload, Plus, Save } from 'lucide-react';
import {
  backup,
  clearDemo,
  flush,
  mutate,
  restore,
  resetCivilization,
  resetAll,
  toast,
  updateSettings,
  useAtlas,
} from '../app/store';
import { type Backup, decodeBackup, exportFile, listBackups, readBackup } from '../db/storage';
import { uid } from '../lib/model';
import { playSound } from '../lib/sound';
import { dateLabel } from '../lib/time';
import {
  Button,
  Confirm,
  IconButton,
  Modal,
  PageHeader,
  Select,
  SectionTitle,
} from '../components/ui';

export function Settings() {
  const { data, saveState } = useAtlas();
  const d = data!;
  const [backups, setBackups] = useState<Backup[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    action: string;
    detail: string;
    run: () => Promise<void>;
  } | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState('#c55327');
  const [resetEndsAt, setResetEndsAt] = useState<number | null>(null);
  const [resetClock, setResetClock] = useState(Date.now());
  const resetSeconds =
    resetEndsAt === null ? 10 : Math.max(0, Math.ceil((resetEndsAt - resetClock) / 1000));
  useEffect(() => {
    if (resetEndsAt === null) return;
    const interval = setInterval(() => setResetClock(Date.now()), 200);
    return () => clearInterval(interval);
  }, [resetEndsAt]);
  useEffect(() => {
    void listBackups()
      .then(setBackups)
      .catch((e) => toast(String(e)));
  }, []);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      toast(`Action failed: ${String(e instanceof Error ? e.message : e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBackups(await listBackups());
  }
  async function importFile() {
    let contents: string | undefined;
    if ('__TAURI_INTERNALS__' in window) {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const path = await open({
        multiple: false,
        filters: [{ name: 'ATLAS backup', extensions: ['json'] }],
      });
      if (!path || Array.isArray(path)) return;
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      contents = await readTextFile(path);
    } else {
      contents = await new Promise<string | undefined>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return resolve(undefined);
          if (file.size > 100 * 1024 * 1024) return reject(new Error('The backup exceeds 100 MB.'));
          resolve(await file.text());
        };
        input.oncancel = () => resolve(undefined);
        input.click();
      });
    }
    if (!contents) return;
    const envelope = await decodeBackup(contents);
    setConfirm({
      title: 'Import this notebook?',
      action: 'Import notebook',
      detail: `Created ${dateLabel(envelope.createdAt)} · ${envelope.snapshot.topics.length} topics. Your current notebook will be backed up first.`,
      run: () => restore(envelope),
    });
  }
  function askRestore(item: Backup) {
    void run(async () => {
      const envelope = await readBackup(item.id);
      setConfirm({
        title: 'Restore this backup?',
        action: 'Restore backup',
        detail: `${item.label} · ${dateLabel(item.createdAt)}. Your current notebook will be backed up first.`,
        run: () => restore(envelope),
      });
    });
  }
  function addSubject() {
    if (!subjectName.trim()) return;
    mutate((s) => {
      s.subjects.push({ id: uid(), name: subjectName.trim(), color: subjectColor, demo: false });
    });
    setSubjectName('');
    toast('Subject added');
  }
  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="MAKE THE NOTEBOOK YOURS"
        title="Settings."
        description="A few choices to make this space feel right for you."
      />
      <div className="settings-layout">
        <div className="settings-main">
          <section className="settings-section">
            <SectionTitle>Appearance</SectionTitle>
            <div className="settings-row">
              <div>
                <strong>Theme</strong>
                <p>Choose the paper you prefer.</p>
              </div>
              <Select
                aria-label="Theme"
                value={d.settings.theme}
                onChange={(e) =>
                  updateSettings({ theme: e.target.value as typeof d.settings.theme })
                }
              >
                <option value="light">Light paper</option>
                <option value="dark">Dark paper</option>
                <option value="system">Follow system</option>
              </Select>
            </div>
            <div className="settings-row">
              <div>
                <strong>Motion</strong>
                <p>Keep transitions comfortable.</p>
              </div>
              <Select
                aria-label="Motion"
                value={d.settings.motion}
                onChange={(e) =>
                  updateSettings({ motion: e.target.value as typeof d.settings.motion })
                }
              >
                <option value="full">Full motion</option>
                <option value="reduced">Reduced motion</option>
              </Select>
            </div>
            <div className="settings-row">
              <div>
                <strong>Notebook grid</strong>
                <p>A quiet guide behind your ideas.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={d.settings.grid}
                  onChange={(e) => updateSettings({ grid: e.target.checked })}
                />
                <span />
              </label>
            </div>
            {d.settings.grid && (
              <div className="settings-row">
                <div>
                  <strong>Grid intensity</strong>
                  <p>From barely visible to a clear page.</p>
                </div>
                <input
                  aria-label="Grid intensity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={d.settings.gridIntensity}
                  onChange={(e) => updateSettings({ gridIntensity: Number(e.target.value) })}
                />
              </div>
            )}
          </section>
          <section className="settings-section">
            <SectionTitle>Sound</SectionTitle>
            <div className="settings-row">
              <div>
                <strong>Sound effects</strong>
                <p>Quiet notes for meaningful moments.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Sound effects"
                  checked={d.settings.soundEffects}
                  onChange={(e) => updateSettings({ soundEffects: e.target.checked })}
                />
                <span />
              </label>
            </div>
            {d.settings.soundEffects && (
              <div className="settings-row">
                <div>
                  <strong>Volume</strong>
                  <p>Soft by default. Find your comfortable level.</p>
                </div>
                <div className="sound-controls">
                  <input
                    aria-label="Sound volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={d.settings.soundVolume}
                    onChange={(e) => updateSettings({ soundVolume: Number(e.target.value) })}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => playSound('pass', true, d.settings.soundVolume)}
                  >
                    Preview
                  </Button>
                </div>
              </div>
            )}
          </section>
          <section className="settings-section">
            <SectionTitle>Study rhythm</SectionTitle>
            <div className="settings-row">
              <div>
                <strong>Weekly test day</strong>
                <p>A gentle reminder for ideas waiting to be tested.</p>
              </div>
              <Select
                aria-label="Weekly test day"
                value={d.settings.testDay}
                onChange={(e) => updateSettings({ testDay: Number(e.target.value) })}
              >
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                  (day, i) => (
                    <option value={i} key={day}>
                      {day}
                    </option>
                  ),
                )}
              </Select>
            </div>
            <div className="settings-row">
              <div>
                <strong>Daily study intention</strong>
                <p>Set to 0 to hide your goal.</p>
              </div>
              <label className="number-field">
                <input
                  aria-label="Daily goal minutes"
                  type="number"
                  min="0"
                  max="1440"
                  value={d.settings.dailyGoal}
                  onChange={(e) =>
                    updateSettings({
                      dailyGoal: Math.min(1440, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
                <span>min / day</span>
              </label>
            </div>
          </section>
          <section className="settings-section">
            <SectionTitle>Subjects</SectionTitle>
            <p className="settings-description">
              Each topic belongs to one subject. You can rename subjects at any time.
            </p>
            <div className="subject-settings">
              {d.subjects.map((s) => (
                <div key={s.id} className="subject-setting">
                  <input
                    type="color"
                    aria-label={`${s.name} color`}
                    value={s.color}
                    onChange={(e) =>
                      mutate((x) => {
                        const subject = x.subjects.find((v) => v.id === s.id)!;
                        subject.color = e.target.value;
                        subject.demo = false;
                      })
                    }
                  />
                  <input
                    aria-label="Subject name"
                    value={s.name}
                    maxLength={120}
                    onChange={(e) => {
                      if (e.target.value.trim())
                        mutate((x) => {
                          const subject = x.subjects.find((v) => v.id === s.id)!;
                          subject.name = e.target.value;
                          subject.demo = false;
                        });
                    }}
                  />
                  <IconButton
                    label={`Delete ${s.name}`}
                    disabled={d.topics.some((t) => t.subjectId === s.id)}
                    title={
                      d.topics.some((t) => t.subjectId === s.id)
                        ? 'Move or delete its topics first'
                        : undefined
                    }
                    onClick={() =>
                      setConfirm({
                        title: `Delete ${s.name}?`,
                        action: 'Delete subject',
                        detail: 'This subject has no topics and can be removed safely.',
                        run: async () => {
                          mutate((x) => {
                            x.subjects = x.subjects.filter((v) => v.id !== s.id);
                          });
                        },
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              ))}
            </div>
            <form
              className="new-subject"
              onSubmit={(e) => {
                e.preventDefault();
                addSubject();
              }}
            >
              <input
                type="color"
                aria-label="New subject color"
                value={subjectColor}
                onChange={(e) => setSubjectColor(e.target.value)}
              />
              <input
                aria-label="New subject name"
                placeholder="New subject name"
                maxLength={120}
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
              <Button type="submit" disabled={!subjectName.trim()}>
                <Plus size={16} />
                Add
              </Button>
            </form>
          </section>
          <section className="settings-section">
            <SectionTitle>Civilization</SectionTitle>
            <div className="settings-row">
              <div>
                <strong>Enable Civilization</strong>
                <p>A notebook layer built from your learning.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Enable Civilization"
                  checked={d.civilization.enabled}
                  onChange={(e) =>
                    mutate((x) => {
                      x.civilization.enabled = e.target.checked;
                    })
                  }
                />
                <span />
              </label>
            </div>
            {d.civilization.enabled && (
              <>
                <div className="settings-row">
                  <div>
                    <strong>Civilization name</strong>
                    <p>Your world, your name.</p>
                  </div>
                  <input
                    aria-label="Civilization name setting"
                    maxLength={100}
                    value={d.civilization.name}
                    onChange={(e) => {
                      if (e.target.value.trim())
                        mutate((x) => {
                          x.civilization.name = e.target.value;
                        });
                    }}
                  />
                </div>
                <div className="settings-row">
                  <div>
                    <strong>Reduced civilization motion</strong>
                    <p>Keep the schematic still.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      aria-label="Reduced civilization motion"
                      checked={d.civilization.reducedMotion}
                      onChange={(e) =>
                        mutate((x) => {
                          x.civilization.reducedMotion = e.target.checked;
                        })
                      }
                    />
                    <span />
                  </label>
                </div>
                <div className="settings-row">
                  <div>
                    <strong>Event frequency</strong>
                    <p>Decisions require real study sessions.</p>
                  </div>
                  <Select
                    aria-label="Civilization event frequency"
                    value={d.civilization.eventFrequency}
                    onChange={(e) =>
                      mutate((x) => {
                        x.civilization.eventFrequency = e.target.value as 'rare' | 'normal';
                      })
                    }
                  >
                    <option value="rare">Rare</option>
                    <option value="normal">Occasional</option>
                  </Select>
                </div>
              </>
            )}
            <div className="danger-zone">
              <div>
                <strong>Reset Civilization</strong>
                <p>
                  Restore the starting civilization. Topics, map, sessions, and tests stay in place.
                  A backup is created first.
                </p>
              </div>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: 'Reset Civilization?',
                    action: 'Reset Civilization',
                    detail:
                      'Your civilization decisions, projects, and custom systems will be reset. ATLAS will back up the notebook first. Learning data stays.',
                    run: resetCivilization,
                  })
                }
              >
                <RotateCcw size={16} /> Reset Civilization
              </Button>
            </div>
          </section>
          <section className="settings-section">
            <SectionTitle>Data & backups</SectionTitle>
            <p className="settings-description">
              ATLAS saves each change locally. Export a copy to another drive for long term safety.
            </p>
            <div className="settings-row">
              <div>
                <strong>Automatic backups</strong>
                <p>After changes, at most every six hours. The latest 12 local backups are kept.</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  aria-label="Automatic backups"
                  checked={d.settings.automaticBackups}
                  onChange={(event) => updateSettings({ automaticBackups: event.target.checked })}
                />
                <span />
              </label>
            </div>
            <div className="data-actions">
              <Button
                disabled={busy || saveState === 'error'}
                onClick={() =>
                  void run(async () => {
                    await flush();
                    if (await exportFile(d)) toast('Notebook exported');
                  })
                }
              >
                <Download size={16} />
                Export JSON
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => void run(importFile)}>
                <Upload size={16} />
                Import JSON
              </Button>
              <Button
                variant="secondary"
                disabled={busy || saveState === 'error'}
                onClick={() =>
                  void run(async () => {
                    await backup();
                    await refresh();
                    toast('Backup created');
                  })
                }
              >
                <HardDriveDownload size={16} />
                Create backup
              </Button>
            </div>
            <div className="backup-list">
              <strong>Recent local backups</strong>
              {backups.length ? (
                backups.map((b) => (
                  <div key={b.id}>
                    <span>
                      {b.label}
                      <small>
                        {dateLabel(b.createdAt, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </small>
                    </span>
                    <Button variant="ghost" disabled={busy} onClick={() => askRestore(b)}>
                      <RotateCcw size={15} />
                      Restore
                    </Button>
                  </div>
                ))
              ) : (
                <p>No backups yet.</p>
              )}
            </div>
            <div className="danger-zone">
              <div>
                <strong>Clear Demo Data</strong>
                <p>
                  Remove untouched sample content and sessions. Your work and active timer are kept.
                  A backup is created first.
                </p>
              </div>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  setConfirm({
                    title: 'Clear Demo Data?',
                    action: 'Clear Demo Data',
                    detail:
                      'Untouched examples will be removed. ATLAS will create a backup before changing anything.',
                    run: clearDemo,
                  })
                }
              >
                <Trash2 size={16} />
                Clear Demo Data
              </Button>
            </div>
            <div className="danger-zone full-reset">
              <div>
                <strong>Reset everything</strong>
                <p>
                  Erase all topics, sessions, map, settings, civilization progress, and local
                  backups from this device.
                </p>
              </div>
              <Button
                variant="danger"
                disabled={busy || saveState === 'error'}
                onClick={() => {
                  const now = Date.now();
                  setResetClock(now);
                  setResetEndsAt(now + 10_000);
                }}
              >
                <Trash2 size={16} /> Reset everything
              </Button>
            </div>
          </section>
        </div>
        <aside className="settings-aside">
          <span className="eyebrow">YOUR NOTEBOOK</span>
          <img src="/atlas-mark.svg" alt="" />
          <h2>Made for the long way around.</h2>
          <p>
            Learning can begin with a question, wander through many ideas, and come back with a
            deeper answer.
          </p>
          <div className="mini-rule" />
          <small>
            ATLAS 1.1.0
            <br />
            Stored on this device · export a backup anytime.
          </small>
          <div className="settings-save">
            <Save size={15} />
            {saveState === 'saved'
              ? 'All changes saved'
              : saveState === 'saving'
                ? 'Saving changes…'
                : 'Save needs attention'}
          </div>
        </aside>
      </div>
      {confirm && (
        <Confirm
          title={confirm.title}
          action={confirm.action}
          danger={confirm.action.includes('Clear') || confirm.action.includes('Delete')}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            const task = confirm.run;
            setConfirm(null);
            void run(async () => {
              await task();
              await refresh();
            });
          }}
        >
          <p>{confirm.detail}</p>
        </Confirm>
      )}
      {resetEndsAt !== null && (
        <Modal title="Reset all ATLAS data?" onClose={() => setResetEndsAt(null)}>
          <div className="full-reset-confirm">
            <p>
              This returns ATLAS to a completely empty first launch. It deletes all learning data
              and app-managed backups on this device. Exported JSON files outside ATLAS are
              unaffected.
            </p>
            <strong>
              {resetSeconds > 0 ? `You can confirm in ${resetSeconds}s` : 'Ready to reset'}
            </strong>
            <div className="dialog-actions">
              <Button variant="ghost" onClick={() => setResetEndsAt(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={resetSeconds > 0 || busy}
                onClick={() => {
                  if (Date.now() < resetEndsAt) return;
                  setResetEndsAt(null);
                  void run(resetAll);
                }}
              >
                Erase everything
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

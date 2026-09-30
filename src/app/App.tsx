import { useEffect, useState } from 'react';
import {
  BookOpen,
  Clock3,
  Orbit,
  House,
  ListChecks,
  Map as MapIcon,
  Search,
  Settings2,
  ShieldCheck,
  Plus,
  X,
  AlertCircle,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import {
  initialize,
  completeTimerIfDue,
  dismissTimerFinished,
  flush,
  navigate,
  retrySave,
  playFeedback,
  selectTopic,
  setAdding,
  setSearch,
  useAtlas,
  type Page,
} from './store';
import { QuickAdd } from '../features/Checklist';
import { Checklist } from '../features/Checklist';
import { Home } from '../features/Home';
import { KnowledgeMap } from '../features/KnowledgeMap';
import { Study } from '../features/Study';
import { History } from '../features/History';
import { Retention } from '../features/Retention';
import { Settings } from '../features/Settings';
import { CivilizationPage } from '../features/Civilization';
import { TopicDetail } from '../features/TopicDetail';
import { Button, IconButton, Modal } from '../components/ui';
import { duration, remaining } from '../lib/time';

const pages: { id: Page; label: string; icon: typeof House }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'checklist', label: 'Checklist', icon: ListChecks },
  { id: 'map', label: 'Knowledge map', icon: MapIcon },
  { id: 'study', label: 'Study', icon: Clock3 },
  { id: 'history', label: 'History', icon: BookOpen },
  { id: 'tests', label: 'Weekly test', icon: ShieldCheck },
  { id: 'civilization', label: 'Civilization', icon: Orbit },
];

function useAppearance(
  theme: 'light' | 'dark' | 'system',
  motion: 'full' | 'reduced',
  grid: boolean,
  intensity: number,
) {
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motion;
    root.style.setProperty('--grid-opacity', grid ? String(intensity) : '0');
  }, [motion, grid, intensity]);
}

export function App() {
  const { data, page, selectedTopic, adding, search, toast, saveState, error, timerFinished } =
    useAtlas();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState(Date.now());
  useAppearance(
    data?.settings.theme ?? 'light',
    data?.settings.motion ?? 'full',
    data?.settings.grid ?? true,
    data?.settings.gridIntensity ?? 0.45,
  );
  useEffect(() => {
    void initialize();
  }, []);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const control = target.closest('button, input[type="checkbox"], input[type="radio"]') as
        HTMLButtonElement | HTMLInputElement | null;
      if (control && !control.disabled) playFeedback('click');
    };
    const change = (event: Event) => {
      if ((event.target as HTMLElement).matches('select, input[type="range"]'))
        playFeedback('select');
    };
    document.addEventListener('click', click);
    document.addEventListener('change', change);
    return () => {
      document.removeEventListener('click', click);
      document.removeEventListener('change', change);
    };
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape') setSearchOpen(false);
      if (document.querySelector('dialog[open]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setAdding(true);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  useEffect(() => {
    if (data?.timer?.runningSince == null) return;
    const tick = () => {
      setClock(Date.now());
      completeTimerIfDue();
    };
    tick();
    const interval = setInterval(tick, 500);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [data?.timer?.runningSince]);
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let closing = false;
    let unlisten: (() => void) | undefined;
    void import('@tauri-apps/api/window').then(async ({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      unlisten = await win.onCloseRequested(async (event) => {
        if (closing) return;
        event.preventDefault();
        try {
          await flush();
          closing = true;
          await win.close();
        } catch {
          retrySave();
          window.alert(
            'ATLAS could not save your latest changes. Please keep the app open, check Settings, and retry saving.',
          );
        }
      });
      if (disposed) unlisten();
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (saveState !== 'saved') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [saveState]);

  if (!data)
    return (
      <div className="boot-screen">
        <img src="/atlas-mark.svg" alt="" />
        <span className="eyebrow">A NOTEBOOK FOR YOUR MIND</span>
        <h1>ATLAS</h1>
        {error ? (
          <>
            <p>{error}</p>
            <Button
              onClick={() => {
                retrySave();
                void initialize();
              }}
            >
              <RotateCw size={16} />
              Retry loading
            </Button>
          </>
        ) : (
          <p>Opening your notebook…</p>
        )}
      </div>
    );
  const waiting = data.topics.filter((t) => t.mastery === 2).length;
  const results = search.trim()
    ? data.topics
        .filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 15)
    : [];
  const pageContent = {
    home: <Home />,
    checklist: <Checklist />,
    map: <KnowledgeMap />,
    study: <Study />,
    history: <History />,
    tests: <Retention />,
    civilization: <CivilizationPage />,
    settings: <Settings />,
  }[page];
  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <button
          className="brand"
          onClick={() => {
            navigate('home');
            setMenuOpen(false);
          }}
        >
          <img src="/atlas-mark.svg" alt="" />
          <span>
            <strong>ATLAS</strong>
            <small>YOUR LEARNING NOTEBOOK</small>
          </span>
        </button>
        <div className="sidebar-rule" />
        <span className="nav-caption">YOUR SPACE</span>
        <nav aria-label="Main navigation">
          {pages
            .filter(({ id }) => id !== 'civilization' || data.civilization.enabled)
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-link ${page === id ? 'active' : ''}`}
                aria-current={page === id ? 'page' : undefined}
                onClick={() => {
                  navigate(id);
                  setMenuOpen(false);
                }}
              >
                <Icon size={18} strokeWidth={1.7} />
                <span>{label}</span>
                {id === 'tests' && waiting > 0 && <em>{waiting}</em>}
                {id === 'study' && data.timer?.runningSince != null && (
                  <i className="nav-running" />
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-link ${page === 'settings' ? 'active' : ''}`}
            onClick={() => {
              navigate('settings');
              setMenuOpen(false);
            }}
          >
            <Settings2 size={18} strokeWidth={1.7} />
            <span>Settings</span>
          </button>
          <div className="sidebar-quote">
            “The more I learn, the more I realize how much I don't know.”
            <small>— Albert Einstein</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <ListChecks size={20} />
          </button>
          <span className="topbar-context">
            {pages.find((p) => p.id === page)?.label ?? 'Settings'}{' '}
            <span className="topbar-slash">/</span>{' '}
            <span className="topbar-subtitle">A place for what you are learning</span>
          </span>
          <div className="topbar-actions">
            {data.timer && (
              <button className="active-timer" onClick={() => navigate('study')}>
                <span
                  className={`status-dot ${data.timer.runningSince != null ? 'running' : ''}`}
                />
                {duration(remaining(data.timer, clock), true)}
              </button>
            )}
            <button className="topbar-search" onClick={() => setSearchOpen(true)}>
              <Search size={17} />
              <span>Search</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button className="topbar-add" onClick={() => setAdding(true)}>
              <Plus size={17} />
              <span>New topic</span>
            </button>
          </div>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <Button variant="secondary" onClick={retrySave}>
              Retry save
            </Button>
          </div>
        )}
        <main key={page} className="main-content">
          {pageContent}
        </main>
        <div className={`save-indicator ${saveState}`} aria-live="polite">
          <span className="save-dot" />
          {saveState === 'saved'
            ? 'All changes saved'
            : saveState === 'saving'
              ? 'Saving changes…'
              : 'Changes not saved'}
        </div>
      </div>
      {adding && <QuickAdd onClose={() => setAdding(false)} />}
      {selectedTopic && data.topics.some((t) => t.id === selectedTopic) && (
        <TopicDetail key={selectedTopic} />
      )}
      {timerFinished && (
        <Modal
          title="Focus complete"
          onClose={dismissTimerFinished}
          className="focus-complete-modal"
        >
          <div className="focus-complete-content">
            <span className="eyebrow">A SESSION FINISHED</span>
            <h3>
              {timerFinished.minutes} {timerFinished.minutes === 1 ? 'minute' : 'minutes'} of
              focused learning.
            </h3>
            <p>{timerFinished.topic} is saved in your study journal.</p>
            <Button onClick={dismissTimerFinished}>
              Beautiful work <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {searchOpen && (
        <div
          className="search-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSearchOpen(false);
          }}
        >
          <div
            className="command-search"
            role="dialog"
            aria-modal="true"
            aria-label="Search topics"
          >
            <div className="command-input">
              <Search size={19} />
              <input
                autoFocus
                placeholder="Search your notebook…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <IconButton label="Close search" onClick={() => setSearchOpen(false)}>
                <X size={17} />
              </IconButton>
            </div>
            <div className="command-results">
              {results.length ? (
                results.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      selectTopic(t.id);
                      setSearchOpen(false);
                    }}
                  >
                    <span>{t.name}</span>
                    <small>{data.subjects.find((s) => s.id === t.subjectId)?.name}</small>
                  </button>
                ))
              ) : (
                <p>{search ? 'No ideas found.' : 'Start typing to find an idea.'}</p>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`toast ${toast.record ? 'record' : ''}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}

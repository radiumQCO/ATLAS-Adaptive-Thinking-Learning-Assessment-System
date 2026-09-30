import { useState } from 'react';
import { ArrowRight, Check, CircleHelp, Compass, Link2, Plus, Sparkles, X } from 'lucide-react';
import {
  addTopic,
  mutate,
  navigate,
  playFeedback,
  selectTopic,
  toast,
  useAtlas,
} from '../app/store';
import { Button, Modal, PageHeader, Select } from '../components/ui';
import {
  availableChallenges,
  capabilityState,
  challenges,
  linkedTopics,
  projectReady,
  systemTerritory,
  territoryProfile,
  sectors,
  type Capability,
  type CapabilityState,
} from '../lib/civilization';
import { uid, type Topic } from '../lib/model';
import { dateLabel } from '../lib/time';

const stateLabel: Record<CapabilityState, string> = {
  unknown: 'Uncharted',
  learning: 'Taking shape',
  experimental: 'Experimental',
  stable: 'Established',
};
function Schematic({
  systems,
  topics,
  reduced,
  projects,
  size,
}: {
  systems: Capability[];
  topics: Topic[];
  reduced: boolean;
  projects: string[];
  size: number;
}) {
  const state = (id: string) => {
    const item = systems.find((s) => s.id === id);
    return item ? capabilityState(item, topics) : 'unknown';
  };
  const active = (id: string) => ['experimental', 'stable'].includes(state(id));
  return (
    <div className={`civ-schematic ${reduced ? 'still' : ''}`} aria-label="Orbital state schematic">
      <svg
        viewBox="0 0 800 390"
        role="img"
        aria-label="An orbital civilization growing with learned capabilities"
      >
        <defs>
          <pattern id="civ-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="currentColor"
              opacity=".12"
              strokeWidth="1"
            />
          </pattern>
          <linearGradient id="civ-halo">
            <stop stopColor="#c55327" stopOpacity=".3" />
            <stop offset="1" stopColor="#c55327" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="800" height="390" fill="url(#civ-grid)" />
        <circle
          cx="397"
          cy="192"
          r={Math.min(155, 75 + Math.sqrt(size) * 18)}
          fill="none"
          stroke="currentColor"
          opacity=".15"
          strokeDasharray="3 7"
        />
        <circle cx="397" cy="192" r="105" fill="none" stroke="currentColor" opacity=".22" />
        <ellipse
          cx="397"
          cy="192"
          rx="230"
          ry="73"
          fill="none"
          stroke="currentColor"
          opacity=".27"
          transform="rotate(-12 397 192)"
        />
        <path
          d="M 310 190 H 488 M 397 105 V 279"
          stroke="currentColor"
          strokeWidth="2"
          opacity=".55"
        />
        <circle
          cx="397"
          cy="192"
          r="53"
          fill="var(--paper-solid)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="397"
          cy="192"
          r="40"
          fill="none"
          stroke="currentColor"
          opacity=".4"
          strokeDasharray="2 4"
        />
        <path d="M 365 192 H 429 M 397 160 V 224" stroke="currentColor" opacity=".7" />
        <text x="397" y="198" textAnchor="middle" className="civ-drawing-label">
          ATLAS
        </text>
        {active('electric-grid') && (
          <g className="civ-drawn">
            <path
              d="M 270 175 L 232 145 L 197 155 M 270 205 L 232 235 L 197 225"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="2"
            />
            <circle cx="197" cy="155" r="15" fill="none" stroke="var(--orange)" />
            <circle cx="197" cy="225" r="15" fill="none" stroke="var(--orange)" />
            <text x="86" y="194" className="civ-small-label">
              POWER
            </text>
          </g>
        )}
        {active('research-lab') && (
          <g className="civ-drawn">
            <path
              d="M 397 139 V 70 M 362 72 H 432 M 372 55 H 422"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="2"
            />
            <rect x="374" y="31" width="46" height="24" fill="none" stroke="var(--orange)" />
            <text x="445" y="52" className="civ-small-label">
              RESEARCH
            </text>
          </g>
        )}
        {active('classical-computing') && (
          <g className="civ-drawn">
            <path
              d="M 452 177 L 545 146 M 452 208 L 545 239"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="2"
            />
            <rect
              x="545"
              y="124"
              width="55"
              height="45"
              rx="3"
              fill="none"
              stroke="var(--orange)"
            />
            <path
              d="M 555 135 H 590 M 555 145 H 590 M 555 155 H 580"
              stroke="var(--orange)"
              opacity=".7"
            />
            <text x="615" y="148" className="civ-small-label">
              COMPUTING
            </text>
          </g>
        )}
        {active('manufacturing') && (
          <g className="civ-drawn">
            <path
              d="M 397 245 V 308 M 347 308 H 447"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="2"
            />
            <rect x="347" y="308" width="100" height="30" fill="none" stroke="var(--orange)" />
            <path
              d="M 363 308 V 338 M 380 308 V 338 M 398 308 V 338 M 415 308 V 338 M 432 308 V 338"
              stroke="var(--orange)"
              opacity=".5"
            />
            <text x="456" y="330" className="civ-small-label">
              INDUSTRY
            </text>
          </g>
        )}
        {active('quantum-computing') && (
          <g className="civ-drawn">
            <circle cx="590" cy="276" r="27" fill="none" stroke="var(--orange)" strokeWidth="2" />
            <ellipse
              cx="590"
              cy="276"
              rx="38"
              ry="12"
              fill="none"
              stroke="var(--orange)"
              transform="rotate(-25 590 276)"
            />
            <circle cx="590" cy="276" r="4" fill="var(--orange)" />
            <text x="645" y="279" className="civ-small-label">
              QUANTUM
            </text>
          </g>
        )}
        {projects.includes('habitat') && (
          <g className="civ-drawn">
            <path d="M 453 161 L 548 78" fill="none" stroke="var(--orange)" strokeWidth="2" />
            <rect
              x="531"
              y="51"
              width="71"
              height="47"
              rx="18"
              fill="var(--paper-solid)"
              stroke="var(--orange)"
              strokeWidth="2"
            />
            <path d="M 548 51 V 98 M 583 51 V 98" stroke="var(--orange)" opacity=".55" />
            <text x="614" y="70" className="civ-small-label">
              HABITAT
            </text>
          </g>
        )}
        {projects.includes('closed-loop') && (
          <g className="civ-drawn">
            <circle
              cx="397"
              cy="192"
              r="79"
              fill="none"
              stroke="var(--orange)"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <text x="288" y="111" className="civ-small-label">
              CLOSED LOOP
            </text>
          </g>
        )}
        <path
          d="M 38 40 H 130 M 38 40 V 78 M 762 40 H 670 M 762 40 V 78 M 38 350 H 130 M 38 350 V 312 M 762 350 H 670 M 762 350 V 312"
          fill="none"
          stroke="currentColor"
          opacity=".32"
        />
        <text x="40" y="35" className="civ-small-label">
          FIG. 01 — KNOWLEDGE IN STRUCTURE
        </text>
      </svg>
    </div>
  );
}

function TerritoryGlyph({ cells, color }: { cells: { x: number; y: number }[]; color: string }) {
  if (!cells.length) return <span className="civ-empty-glyph" />;
  const bounds = cells.reduce(
    (box, cell) => ({
      minX: Math.min(box.minX, cell.x),
      minY: Math.min(box.minY, cell.y),
      maxX: Math.max(box.maxX, cell.x),
      maxY: Math.max(box.maxY, cell.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const { minX, minY, maxX, maxY } = bounds;
  return (
    <svg
      className="civ-territory-glyph"
      viewBox={`-1 -1 ${maxX - minX + 3} ${maxY - minY + 3}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label={`${cells.length} Knowledge Map cells`}
      role="img"
    >
      {cells.map((cell, index) => (
        <rect
          key={`${cell.x}-${cell.y}-${index}`}
          x={cell.x - minX}
          y={cell.y - minY}
          width=".94"
          height=".94"
          fill={color}
        />
      ))}
    </svg>
  );
}

export function CivilizationPage() {
  const { data } = useAtlas();
  const d = data!;
  const civ = d.civilization;
  const [selected, setSelected] = useState<string | null>(null);
  const [sector, setSector] = useState<(typeof sectors)[number]>('Science');
  const [territoryId, setTerritoryId] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [newName, setNewName] = useState('');
  const [newConcepts, setNewConcepts] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [linkTopic, setLinkTopic] = useState<Record<string, string>>({});
  const [introName, setIntroName] = useState(civ.name);
  const territories = d.countries.filter((country) =>
    d.nodes.some((node) => node.countryId === country.id),
  );
  const activeTerritory =
    territories.find((country) => country.id === territoryId) ?? territories[0];
  const profile = activeTerritory ? territoryProfile(d, activeTerritory.id) : null;
  const systems = profile?.systems ?? [];
  const focused = civ.systems.find((s) => s.id === selected);
  const states = civ.systems.map((s) => capabilityState(s, d.topics));
  const established = states.filter((s) => s === 'stable').length;
  const challenges = availableChallenges(d).filter((challenge) => {
    const system = civ.systems.find((item) => item.id === challenge.requiredSystem);
    return Boolean(activeTerritory && system && systemTerritory(d, system) === activeTerritory.id);
  });
  const pendingChallenge = challenges[0];
  const visibleProjects = profile?.completedProjects.map((project) => project.id) ?? [];
  const now = Date.now();
  function unlockQuote(id: string) {
    setSelected(id);
    const system = civ.systems.find((s) => s.id === id);
    if (system && capabilityState(system, d.topics) !== 'unknown') playFeedback('unlock');
  }
  function addSystem() {
    const concepts = newConcepts
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (!newName.trim() || !concepts.length) return;
    const id = uid();
    mutate((draft) =>
      draft.civilization.systems.push({
        id,
        name: newName.trim(),
        sector,
        description: newDescription.trim(),
        quote:
          newQuote.trim() || 'What you understand today becomes the world you can build tomorrow.',
        requirements: concepts.map((label) => ({ id: uid(), label, topicIds: [], minMastery: 2 })),
        custom: true,
      }),
    );
    setNewName('');
    setNewConcepts('');
    setNewDescription('');
    setNewQuote('');
    unlockQuote(id);
    playFeedback('add');
  }
  return (
    <div className="page civ-page">
      <PageHeader
        eyebrow="THE WORLD YOUR KNOWLEDGE CAN BUILD"
        title="Civilization."
        description="Another way to see the countries you have built on your Knowledge Map."
      />
      <div className="civ-topline">
        <span className="eyebrow">{civ.name}</span>
        <span>
          {territories.length} map {territories.length === 1 ? 'civilization' : 'civilizations'} ·{' '}
          {established} established capabilities
        </span>
      </div>
      <div className="civ-hero">
        <div className="civ-hero-copy">
          <span className="eyebrow">
            {activeTerritory ? 'SELECTED MAP TERRITORY' : 'YOUR KNOWLEDGE MAP'}
          </span>
          <h2>{activeTerritory?.name ?? 'Give your ideas a place.'}</h2>
          <p>
            {activeTerritory
              ? 'Its geography comes from placed ideas. Its level follows what you understand, remember, and connect.'
              : 'Place a topic on the Knowledge Map to see its civilization take shape here.'}
          </p>
          <Button variant="ghost" onClick={() => navigate('map')}>
            Open Knowledge Map <ArrowRight size={15} />
          </Button>
          <div className="civ-hero-stats">
            <span>
              <strong>{profile?.size ?? 0}</strong> map cells
            </span>
            <span>
              <strong>{profile?.level ?? 1}</strong> civilization level
            </span>
          </div>
        </div>
        <Schematic
          systems={systems}
          topics={d.topics}
          reduced={civ.reducedMotion || d.settings.motion === 'reduced'}
          projects={visibleProjects}
          size={profile?.size ?? 0}
        />
      </div>
      {territories.length > 0 && (
        <div className="civ-territory-strip" aria-label="Knowledge Map civilizations">
          {territories.map((country) => {
            const current = territoryProfile(d, country.id);
            return (
              <button
                key={country.id}
                className={`civ-territory-card ${country.id === activeTerritory?.id ? 'active' : ''}`}
                onClick={() => setTerritoryId(country.id)}
              >
                <TerritoryGlyph
                  cells={d.nodes.filter((node) => node.countryId === country.id)}
                  color={country.color}
                />
                <span>
                  <strong>{country.name}</strong>
                  <small>
                    {current.size} cells · {current.established + current.experimental} technologies
                  </small>
                </span>
                <em>LEVEL {current.level}</em>
              </button>
            );
          })}
        </div>
      )}
      {profile && (
        <section className="civ-growth" aria-label="Civilization development">
          <div>
            <span className="eyebrow">KNOWLEDGE PROFILE</span>
            <strong>
              {profile.understood} understood · {profile.passed} passed
            </strong>
          </div>
          <div>
            <span className="eyebrow">TECHNOLOGIES</span>
            <strong>
              {profile.established} established · {profile.experimental} experimental
            </strong>
          </div>
          <div>
            <span className="eyebrow">CONVERGENCES</span>
            <strong>{profile.completedProjects.length} completed projects</strong>
          </div>
          <div className="civ-level-track">
            <span className="eyebrow">
              LEVEL {profile.level} · {profile.experience} KNOWLEDGE XP
            </span>
            <div className="civ-level-bar">
              <i
                style={{
                  width: `${(100 * (profile.experience - profile.levelStartsAt)) / (profile.nextLevelAt - profile.levelStartsAt)}%`,
                }}
              />
            </div>
          </div>
        </section>
      )}
      <div className="civ-editorial-grid">
        <section className="civ-capabilities">
          <div className="civ-section-head">
            <div>
              <span className="eyebrow">01 / IDEAS IN THIS TERRITORY</span>
              <h2>What these ideas make possible</h2>
            </div>
            <button className="text-button" onClick={() => setAdvanced(!advanced)}>
              {advanced ? 'Close editor' : 'Advanced editor'} <ArrowRight size={15} />
            </button>
          </div>
          <div className="civ-system-list">
            {systems.map((item, i) => {
              const status = capabilityState(item, d.topics);
              return (
                <button
                  key={item.id}
                  className={`civ-system ${status}`}
                  onClick={() => unlockQuote(item.id)}
                >
                  <span className="civ-system-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="civ-system-main">
                    <strong>{item.name}</strong>
                    <small>
                      {status === 'unknown'
                        ? 'Link or learn its foundations to reveal it.'
                        : item.description}
                    </small>
                  </span>
                  <span className={`civ-status ${status}`}>{stateLabel[status]}</span>
                  <ArrowRight size={17} />
                </button>
              );
            })}
            {!systems.length && (
              <p className="civ-no-systems">
                {activeTerritory
                  ? 'This territory is on the map. Explore and master its topics to reveal what it can support.'
                  : 'Place an idea on Knowledge Map to begin.'}
              </p>
            )}
          </div>
          {advanced && (
            <div className="civ-create">
              <span className="eyebrow">ADD A CAPABILITY</span>
              <p>
                Choose the concepts that must be learned. Link each concept to ATLAS topics after
                creating it.
              </p>
              <div className="civ-create-grid">
                <Select
                  aria-label="Capability sector"
                  value={sector}
                  onChange={(event) => setSector(event.target.value as (typeof sectors)[number])}
                >
                  {sectors.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
                <input
                  aria-label="Capability name"
                  placeholder="Capability name"
                  value={newName}
                  maxLength={120}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  aria-label="Knowledge concepts"
                  placeholder="Required concepts, separated by commas"
                  value={newConcepts}
                  onChange={(e) => setNewConcepts(e.target.value)}
                />
                <input
                  aria-label="Capability description"
                  placeholder="What does it enable?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <input
                  aria-label="Opening quote"
                  placeholder="Opening quote (optional)"
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                />
              </div>
              <Button onClick={addSystem} disabled={!newName.trim() || !newConcepts.trim()}>
                <Plus size={15} /> Add capability
              </Button>
            </div>
          )}
        </section>
        <aside className="civ-side">
          <section>
            <span className="eyebrow">02 / WHERE KNOWLEDGE CONVERGES</span>
            <h2>Projects made possible</h2>
            {(profile?.projects ?? []).map((project) => {
              const ready = projectReady(project, d);
              return (
                <div className="civ-project" key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <span className={`civ-status ${ready ? 'stable' : 'unknown'}`}>
                      {ready ? 'Possible · +140 XP' : 'Foundations needed'}
                    </span>
                  </div>
                  <p>{project.description}</p>
                  <small>
                    {project.systemIds
                      .map((id) => civ.systems.find((s) => s.id === id)?.name ?? id)
                      .join(' · ')}
                  </small>
                </div>
              );
            })}
            {!profile?.projects.length && (
              <p className="hint">More connected knowledge will reveal projects here.</p>
            )}
          </section>
          <section>
            <span className="eyebrow">03 / NEXT KNOWLEDGE GAPS</span>
            <h2>What could be learned next</h2>
            {profile?.gaps.slice(0, 5).map((gap) => (
              <button
                className="civ-gap"
                key={gap}
                onClick={() => {
                  const existing = d.topics.find(
                    (topic) => topic.name.toLocaleLowerCase() === gap.toLocaleLowerCase(),
                  );
                  if (existing) {
                    selectTopic(existing.id);
                    return;
                  }
                  const node = d.nodes.find((node) => node.countryId === activeTerritory?.id);
                  const subjectId = d.topics.find((topic) => topic.id === node?.topicId)?.subjectId;
                  if (subjectId) selectTopic(addTopic(gap, subjectId));
                }}
              >
                <span>{gap}</span>
                <small>Open or add to Checklist</small>
                <Plus size={15} />
              </button>
            ))}
            {!profile?.gaps.length && (
              <p className="hint">
                No visible gap in this territory yet. Place or connect more ideas on the map.
              </p>
            )}
          </section>
          <section>
            <span className="eyebrow">04 / APPLY WHAT YOU KNOW</span>
            <h2>{pendingChallenge?.title ?? 'Nothing needs your attention.'}</h2>
            <p>
              {pendingChallenge?.description ??
                'Keep learning. When a real foundation is ready, new decisions will appear here.'}
            </p>
            {pendingChallenge?.choices
              .filter(
                (choice) =>
                  !choice.requires ||
                  civ.systems.some(
                    (s) =>
                      s.id === choice.requires &&
                      ['experimental', 'stable'].includes(capabilityState(s, d.topics)),
                  ),
              )
              .map((choice) => (
                <button
                  className="civ-choice"
                  key={choice.id}
                  onClick={() => {
                    mutate((x) =>
                      x.civilization.decisions.push({
                        id: pendingChallenge.id,
                        choiceId: choice.id,
                        at: Date.now(),
                      }),
                    );
                    playFeedback('mastery');
                    toast(choice.consequence);
                  }}
                >
                  <strong>{choice.label}</strong>
                  <small>{choice.detail}</small>
                  <ArrowRight size={16} />
                </button>
              ))}
          </section>
          <section>
            <span className="eyebrow">05 / DECISION JOURNAL</span>
            {civ.decisions.length ? (
              [...civ.decisions]
                .reverse()
                .slice(0, 4)
                .map((entry) => {
                  const scenario = challenges.find((c) => c.id === entry.id);
                  const choice = scenario?.choices.find((c) => c.id === entry.choiceId);
                  return (
                    <p key={entry.id} className="civ-journal">
                      <strong>{scenario?.title ?? entry.id.replaceAll('-', ' ')}</strong>
                      <small>
                        {choice?.label ?? entry.choiceId.replaceAll('-', ' ')} ·{' '}
                        {dateLabel(entry.at)}
                      </small>
                      {choice && <small>{choice.consequence}</small>}
                    </p>
                  );
                })
            ) : (
              <p>No decisions yet. There is no need to hurry.</p>
            )}
          </section>
        </aside>
      </div>
      {!civ.onboarded && (
        <Modal
          title="A world built from understanding"
          onClose={() => {
            mutate((x) => {
              x.civilization.onboarded = true;
            });
          }}
          className="civ-intro"
        >
          <div className="civ-intro-mark">
            <Compass size={38} />
          </div>
          <blockquote>
            “Your knowledge is the foundation of this world. Study. Understand. Remember. Build.”
          </blockquote>
          <p>ATLAS reflects what you have learned. It cannot be advanced by clicking or waiting.</p>
          <label className="field">
            Name your civilization
            <input
              aria-label="Civilization name"
              value={introName}
              maxLength={100}
              onChange={(e) => setIntroName(e.target.value)}
            />
          </label>
          <Button
            onClick={() => {
              mutate((x) => {
                x.civilization.name = introName.trim() || 'ATLAS ORBITAL STATE';
                x.civilization.onboarded = true;
              });
              playFeedback('unlock');
            }}
          >
            Begin the atlas <ArrowRight size={16} />
          </Button>
        </Modal>
      )}
      {focused && (
        <Modal title={focused.name} onClose={() => setSelected(null)} wide className="civ-detail">
          <div className="civ-quote">
            <Sparkles size={19} />
            <blockquote>“{focused.quote}”</blockquote>
            <span>ATLAS / {focused.sector.toUpperCase()}</span>
          </div>
          <div className="civ-detail-body">
            <p>{focused.description}</p>
            <span className={`civ-status ${capabilityState(focused, d.topics)}`}>
              {stateLabel[capabilityState(focused, d.topics)]}
            </span>
            <h3>Knowledge foundations</h3>
            <p className="hint">
              The strongest linked topic counts for each concept. Understood makes a system
              experimental; passed makes it established.
            </p>
            {focused.requirements.map((req) => {
              const linked = linkedTopics(req, d.topics);
              return (
                <div className="civ-requirement" key={req.id}>
                  <div>
                    <strong>{req.label}</strong>
                    <small>Needs {req.minMastery === 3 ? 'Passed' : 'Understood'}</small>
                  </div>
                  <div className="civ-topic-links">
                    {linked.map((topic) => (
                      <span key={topic.id}>
                        <button
                          onClick={() => {
                            setSelected(null);
                            selectTopic(topic.id);
                          }}
                        >
                          {topic.name} · {['○', '◔', '◕', '●'][topic.mastery]}
                        </button>
                        {advanced && req.topicIds.includes(topic.id) && (
                          <button
                            aria-label={`Unlink ${topic.name}`}
                            onClick={() =>
                              mutate((x) => {
                                const r = x.civilization.systems
                                  .find((s) => s.id === focused.id)!
                                  .requirements.find((r) => r.id === req.id)!;
                                r.topicIds = r.topicIds.filter((id) => id !== topic.id);
                              })
                            }
                          >
                            <X size={13} />
                          </button>
                        )}
                      </span>
                    ))}
                    {!linked.length && <em>No matching topic yet</em>}
                  </div>
                  {advanced && (
                    <div className="civ-link-input">
                      <Select
                        aria-label={`Link topic to ${req.label}`}
                        value={linkTopic[req.id] ?? ''}
                        onChange={(e) => setLinkTopic({ ...linkTopic, [req.id]: e.target.value })}
                      >
                        <option value="">Choose ATLAS topic</option>
                        {d.topics
                          .filter((t) => !req.topicIds.includes(t.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </Select>
                      <Button
                        variant="secondary"
                        disabled={!linkTopic[req.id]}
                        onClick={() => {
                          mutate((x) => {
                            x.civilization.systems
                              .find((s) => s.id === focused.id)!
                              .requirements.find((r) => r.id === req.id)!
                              .topicIds.push(linkTopic[req.id]);
                          });
                          setLinkTopic({ ...linkTopic, [req.id]: '' });
                        }}
                      >
                        <Link2 size={14} /> Link
                      </Button>
                    </div>
                  )}
                  {advanced && (
                    <div className="civ-req-actions">
                      <Select
                        aria-label={`Required mastery for ${req.label}`}
                        value={req.minMastery}
                        onChange={(e) =>
                          mutate((x) => {
                            x.civilization.systems
                              .find((s) => s.id === focused.id)!
                              .requirements.find((r) => r.id === req.id)!.minMastery = Number(
                              e.target.value,
                            ) as 2 | 3;
                          })
                        }
                      >
                        <option value={2}>Understand first</option>
                        <option value={3}>Pass a review first</option>
                      </Select>
                      {focused.custom && focused.requirements.length > 1 && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            mutate((x) => {
                              const s = x.civilization.systems.find((s) => s.id === focused.id)!;
                              s.requirements = s.requirements.filter((r) => r.id !== req.id);
                            })
                          }
                        >
                          Remove concept
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {focused.custom && advanced && (
              <div className="civ-custom-edit">
                <h3>Edit capability</h3>
                <label className="field">
                  Name
                  <input
                    aria-label="Edit capability name"
                    maxLength={120}
                    value={focused.name}
                    onChange={(e) => {
                      if (e.target.value.trim())
                        mutate((x) => {
                          x.civilization.systems.find((s) => s.id === focused.id)!.name =
                            e.target.value;
                        });
                    }}
                  />
                </label>
                <label className="field">
                  Description
                  <textarea
                    aria-label="Edit capability description"
                    maxLength={1200}
                    value={focused.description}
                    onChange={(e) =>
                      mutate((x) => {
                        x.civilization.systems.find((s) => s.id === focused.id)!.description =
                          e.target.value;
                      })
                    }
                  />
                </label>
                <label className="field">
                  Opening quote
                  <textarea
                    aria-label="Edit opening quote"
                    maxLength={500}
                    value={focused.quote}
                    onChange={(e) =>
                      mutate((x) => {
                        x.civilization.systems.find((s) => s.id === focused.id)!.quote =
                          e.target.value;
                      })
                    }
                  />
                </label>
                <div className="civ-link-input">
                  <input
                    aria-label="New required concept"
                    maxLength={100}
                    placeholder="A new concept to learn"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={!newRequirement.trim() || focused.requirements.length >= 12}
                    onClick={() => {
                      mutate((x) => {
                        x.civilization.systems
                          .find((s) => s.id === focused.id)!
                          .requirements.push({
                            id: uid(),
                            label: newRequirement.trim(),
                            topicIds: [],
                            minMastery: 2,
                          });
                      });
                      setNewRequirement('');
                    }}
                  >
                    <Plus size={14} /> Add concept
                  </Button>
                </div>
              </div>
            )}
            {focused.custom && advanced && (
              <Button
                variant="danger"
                onClick={() => {
                  mutate((x) => {
                    x.civilization.systems = x.civilization.systems.filter(
                      (s) => s.id !== focused.id,
                    );
                    x.civilization.projects = x.civilization.projects.filter(
                      (p) => !p.systemIds.includes(focused.id),
                    );
                  });
                  setSelected(null);
                }}
              >
                <X size={15} /> Delete custom capability
              </Button>
            )}
            <p className="civ-detail-foot">
              <CircleHelp size={15} /> Click a linked topic to open its notebook page.
            </p>
          </div>
        </Modal>
      )}
      <span className="civ-time-note">
        Civilization time advances through study and decisions, never by leaving this page open.{' '}
        {new Date(now).getFullYear()}
      </span>
    </div>
  );
}

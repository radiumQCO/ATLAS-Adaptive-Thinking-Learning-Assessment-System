import { z } from 'zod';
import type { Snapshot, Topic } from './model';

const id = z.string().min(1).max(100);
const RequirementSchema = z.object({
  id,
  label: z.string().trim().min(1).max(100),
  topicIds: z.array(id).max(30),
  minMastery: z.union([z.literal(2), z.literal(3)]),
});
const SystemSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  sector: z.enum(['Science', 'Energy', 'Computing', 'Economy', 'Industry']),
  description: z.string().max(1200),
  quote: z.string().max(500),
  requirements: z.array(RequirementSchema).min(1).max(12),
  custom: z.boolean(),
});
const ProjectSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  systemIds: z.array(id).min(1).max(10),
  approvedAt: z.number().int().nonnegative().nullable(),
});
export const CivilizationSchema = z.object({
  id: z.literal('civilization'),
  name: z.string().trim().min(1).max(100),
  onboarded: z.boolean(),
  enabled: z.boolean(),
  reducedMotion: z.boolean(),
  eventFrequency: z.enum(['rare', 'normal']),
  systems: z.array(SystemSchema).max(300),
  projects: z.array(ProjectSchema).max(100),
  decisions: z.array(z.object({ id, choiceId: id, at: z.number().int().nonnegative() })).max(1000),
});
export type Civilization = z.infer<typeof CivilizationSchema>;
export type Capability = Civilization['systems'][number];
export type Requirement = Capability['requirements'][number];
export type CapabilityState = 'unknown' | 'learning' | 'experimental' | 'stable';
export const sectors = ['Science', 'Energy', 'Computing', 'Economy', 'Industry'] as const;

function system(
  id: string,
  name: string,
  sector: Capability['sector'],
  description: string,
  quote: string,
  concepts: string[],
): Capability {
  return {
    id,
    name,
    sector,
    description,
    quote,
    custom: false,
    requirements: concepts.map((label, index) => ({
      id: `${id}-${index}`,
      label,
      topicIds: [],
      minMastery: 2,
    })),
  };
}
export function defaultCivilization(): Civilization {
  return {
    id: 'civilization',
    name: 'ATLAS ORBITAL STATE',
    onboarded: false,
    enabled: true,
    reducedMotion: false,
    eventFrequency: 'rare',
    decisions: [],
    systems: [
      system(
        'scientific-method',
        'Scientific Method',
        'Science',
        'Turn observation into a testable question.',
        'A civilization begins the moment curiosity becomes a method.',
        ['Scientific Method'],
      ),
      system(
        'research-lab',
        'Research Laboratory',
        'Science',
        'A place where questions can be tested and repeated.',
        'Every instrument is a promise to ask the universe a better question.',
        ['Scientific Method', 'Measurement'],
      ),
      system(
        'electric-grid',
        'Electrical Grid',
        'Energy',
        'Connect generation, transmission, and demand.',
        'A single current crossed the darkness. Distance stopped being an ending.',
        ['Electricity', 'Voltage', 'Current'],
      ),
      system(
        'energy-storage',
        'Energy Storage',
        'Energy',
        'Move energy from the moment it is made to the moment it is needed.',
        'To hold lightning is to give tomorrow a little of today.',
        ['Electricity', 'Energy Storage'],
      ),
      system(
        'fusion-research',
        'Fusion Research',
        'Energy',
        'Study plasma confinement before trusting a reactor.',
        'Inside the smallest star we build, an entire future waits to be understood.',
        ['Thermodynamics', 'Plasma', 'Magnetic Fields'],
      ),
      system(
        'classical-computing',
        'Classical Computing',
        'Computing',
        'Make reliable computation a foundation for later systems.',
        'We taught matter to remember a question, then to answer another.',
        ['Programming', 'Algorithms'],
      ),
      system(
        'high-performance',
        'High Performance Computing',
        'Computing',
        'Coordinate many computations to model difficult systems.',
        'One machine thinks in steps. A thousand can redraw the horizon.',
        ['Algorithms', 'Parallel Computing'],
      ),
      system(
        'quantum-computing',
        'Quantum Computing',
        'Computing',
        'Explore computation built from quantum states and gates.',
        'At the edge of certainty, we learned to compute with possibility.',
        ['Qubits', 'Quantum Gates', 'Linear Algebra'],
      ),
      system(
        'quantum-algorithms',
        'Quantum Algorithms',
        'Computing',
        'Understand circuits, complexity, and measurement before claiming an advantage.',
        'A new algorithm begins where the old map of possibility ends.',
        ['Quantum Algorithms', 'Quantum Gates'],
      ),
      system(
        'qaoa',
        'QAOA',
        'Computing',
        'Explore constrained optimization with parameterized quantum circuits.',
        'We searched for the best path by learning how to ask the landscape.',
        ['QAOA', 'Optimization', 'Quantum Gates'],
      ),
      system(
        'vqe',
        'Variational Quantum Eigensolver',
        'Computing',
        'Connect quantum measurement with classical optimization.',
        'Between measurement and guess, the answer slowly took form.',
        ['VQE', 'Quantum Measurement', 'Optimization'],
      ),
      system(
        'quantum-routing',
        'Quantum Routing',
        'Computing',
        'Map logical circuits onto physical connectivity.',
        'Even a quantum journey needs a path through real space.',
        ['Quantum Routing', 'Quantum Circuits'],
      ),
      system(
        'error-correction',
        'Quantum Error Correction',
        'Computing',
        'Recognize and repair errors without reading away the computation.',
        'The future began when fragile information learned to survive.',
        ['Quantum Error Correction', 'Qubits'],
      ),
      system(
        'production',
        'Basic Production',
        'Economy',
        'Understand inputs, outputs, and scarce capacity.',
        'A society grows when it can name what it needs, and make what it can.',
        ['Production'],
      ),
      system(
        'markets',
        'Markets',
        'Economy',
        'See how supply, demand, and prices interact.',
        'Every price is a conversation between need and possibility.',
        ['Supply and Demand'],
      ),
      system(
        'public-budget',
        'Public Budget',
        'Economy',
        'Choose priorities under a finite budget.',
        'A budget is a map of what a people choose to protect.',
        ['Budget', 'Taxes'],
      ),
      system(
        'manufacturing',
        'Manufacturing',
        'Industry',
        'Turn materials and energy into dependable parts.',
        'An idea becomes civilization when someone can build it twice.',
        ['Materials Science', 'Manufacturing'],
      ),
      system(
        'automation',
        'Automation',
        'Industry',
        'Design repeatable processes with clear human oversight.',
        'The finest machine gives human hands more room to create.',
        ['Programming', 'Manufacturing'],
      ),
      system(
        'advanced-materials',
        'Advanced Materials',
        'Industry',
        'Choose materials by structure and use, not guesswork.',
        'The future is often hidden in the way atoms agree to stand together.',
        ['Materials Science', 'Chemistry'],
      ),
    ],
    projects: [
      {
        id: 'habitat',
        name: 'Orbital Habitat',
        description: 'A sheltered place for a small permanent crew.',
        systemIds: ['electric-grid', 'manufacturing'],
        approvedAt: null,
      },
      {
        id: 'fusion-demo',
        name: 'Fusion Demonstrator',
        description: 'A careful experiment in sustained plasma control.',
        systemIds: ['fusion-research', 'research-lab'],
        approvedAt: null,
      },
      {
        id: 'compute-center',
        name: 'Computing Center',
        description: 'A shared facility for scientific models.',
        systemIds: ['classical-computing', 'research-lab'],
        approvedAt: null,
      },
      {
        id: 'closed-loop',
        name: 'Closed Loop Systems',
        description: 'Reuse energy and materials before expansion.',
        systemIds: ['energy-storage', 'advanced-materials'],
        approvedAt: null,
      },
      {
        id: 'vqe-simulator',
        name: 'VQE Simulator',
        description: 'A conceptual bridge between quantum measurements and classical optimization.',
        systemIds: ['vqe', 'classical-computing'],
        approvedAt: null,
      },
      {
        id: 'qaoa-router',
        name: 'QAOA Router',
        description: 'A research route joining optimization and quantum circuit placement.',
        systemIds: ['qaoa', 'quantum-routing'],
        approvedAt: null,
      },
      {
        id: 'fault-tolerant',
        name: 'Fault-Tolerant Stack',
        description: 'A long horizon requiring computation and correction to work together.',
        systemIds: ['quantum-computing', 'error-correction'],
        approvedAt: null,
      },
    ],
  };
}

const aliases: Record<string, string[]> = {
  'Scientific Method': ['science method'],
  Measurement: ['measurements'],
  Electricity: ['electric circuits', 'electricity basics'],
  Voltage: ['potential difference'],
  Current: ['electric current'],
  'Energy Storage': ['batteries', 'battery'],
  Thermodynamics: ['heat transfer'],
  Plasma: ['plasma physics'],
  'Magnetic Fields': ['magnetism'],
  Programming: ['python', 'coding'],
  Algorithms: ['algorithm'],
  'Parallel Computing': ['parallelism'],
  Qubits: ['qubit', 'quantum bit'],
  'Quantum Gates': ['quantum gate', '2q gate'],
  'Quantum Algorithms': ['quantum algorithm'],
  QAOA: ['quantum approximate optimization algorithm'],
  VQE: ['variational quantum eigensolver'],
  Optimization: ['combinatorial optimization'],
  'Quantum Measurement': ['measurement in quantum computing'],
  'Quantum Routing': ['qubit routing'],
  'Quantum Circuits': ['quantum circuit'],
  'Quantum Error Correction': ['error correction', 'quantum codes'],
  'Linear Algebra': ['matrix', 'matrices', 'vector'],
  Production: ['manufacturing'],
  'Supply and Demand': ['demand and supply'],
  Budget: ['public finance'],
  Taxes: ['taxation'],
  'Materials Science': ['materials'],
  Manufacturing: ['production'],
  Chemistry: ['chemical science'],
};
const normalize = (s: string) =>
  s
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, ' ');
export function linkedTopics(req: Requirement, topics: Topic[]): Topic[] {
  if (req.topicIds.length)
    return req.topicIds.map((id) => topics.find((t) => t.id === id)).filter((t): t is Topic => !!t);
  const names = [req.label, ...(aliases[req.label] ?? [])].map(normalize);
  return topics.filter((t) => names.includes(normalize(t.name)));
}
export function capabilityState(system: Capability, topics: Topic[]): CapabilityState {
  const values = system.requirements.map((req) => {
    const matches = linkedTopics(req, topics);
    return matches.length ? Math.max(...matches.map((t) => t.mastery)) : -1;
  });
  if (values.every((v) => v >= 3)) return 'stable';
  if (values.every((v, index) => v >= system.requirements[index].minMastery)) return 'experimental';
  if (values.some((v) => v >= 0)) return 'learning';
  return 'unknown';
}
export function projectReady(project: Civilization['projects'][number], data: Snapshot) {
  return project.systemIds.every((id) => {
    const system = data.civilization.systems.find((s) => s.id === id);
    return system && ['experimental', 'stable'].includes(capabilityState(system, data.topics));
  });
}
function foundationCounts(data: Snapshot, systems: Capability[]) {
  const counts = new Map<string, number>();
  const locations = new Map(data.nodes.map((n) => [n.topicId, n.countryId]));
  for (const system of systems)
    for (const requirement of system.requirements)
      for (const topic of linkedTopics(requirement, data.topics)) {
        const country = locations.get(topic.id);
        if (country) counts.set(country, (counts.get(country) ?? 0) + 1);
      }
  return counts;
}
function primaryTerritory(counts: Map<string, number>) {
  // A capability can touch several countries. The one supplying most of its ideas gets it.
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}
export function systemTerritory(data: Snapshot, system: Capability) {
  return primaryTerritory(foundationCounts(data, [system]));
}
export function projectTerritory(data: Snapshot, project: Civilization['projects'][number]) {
  const systems = data.civilization.systems.filter((system) =>
    project.systemIds.includes(system.id),
  );
  return primaryTerritory(foundationCounts(data, systems));
}
export function territoryProfile(data: Snapshot, countryId: string) {
  // Land is literally the map cells. Levels come from learning, so a small country can be deep.
  const placed = data.nodes.filter((node) => node.countryId === countryId);
  const size = placed.length;
  const topicById = new Map(data.topics.map((topic) => [topic.id, topic]));
  const topics = placed
    .map((node) => topicById.get(node.topicId))
    .filter((topic): topic is Topic => !!topic);
  const understood = topics.filter((topic) => topic.mastery === 2).length;
  const passed = topics.filter((topic) => topic.mastery === 3).length;
  const tested = new Set(
    data.tests.filter((test) => test.result === 'pass').map((test) => test.topicId),
  );
  const retention = topics.filter((topic) => tested.has(topic.id)).length;
  const depth = topics.reduce((total, topic) => {
    if (topic.mastery < 2) return total;
    let parentId = topic.parentId;
    let layers = 0;
    while (parentId && layers < 5) {
      layers++;
      parentId = topicById.get(parentId)?.parentId ?? null;
    }
    return total + layers * 5;
  }, 0);
  const systems = data.civilization.systems.filter(
    (system) => systemTerritory(data, system) === countryId,
  );
  const established = systems.filter((system) => capabilityState(system, data.topics) === 'stable');
  const experimental = systems.filter(
    (system) => capabilityState(system, data.topics) === 'experimental',
  );
  const projects = data.civilization.projects.filter(
    (project) => projectTerritory(data, project) === countryId,
  );
  const completedProjects = projects.filter((project) => projectReady(project, data));
  const experience =
    understood * 9 +
    passed * 18 +
    retention * 6 +
    depth +
    established.length * 50 +
    experimental.length * 30 +
    completedProjects.length * 140;
  const level = 1 + Math.floor(Math.sqrt(experience / 20));
  const gaps = [
    ...new Set(
      systems.flatMap((system) =>
        system.requirements
          .filter(
            (requirement) =>
              !linkedTopics(requirement, data.topics).some(
                (topic) => topic.mastery >= requirement.minMastery,
              ),
          )
          .map((requirement) => requirement.label),
      ),
    ),
  ];
  return {
    size,
    systems,
    projects,
    completedProjects,
    experience,
    level,
    nextLevelAt: 20 * level * level,
    levelStartsAt: 20 * (level - 1) * (level - 1),
    understood,
    passed,
    retention,
    established: established.length,
    experimental: experimental.length,
    gaps,
  };
}
export interface Challenge {
  id: string;
  title: string;
  description: string;
  afterSessions: number;
  requiredSystem: string;
  choices: { id: string; label: string; detail: string; requires?: string; consequence: string }[];
}
export const challenges: Challenge[] = [
  {
    id: 'energy-balance',
    title: 'Energy balance',
    description:
      'A new module draws more power than the present network can reliably deliver. Choose a trade-off to document.',
    afterSessions: 1,
    requiredSystem: 'electric-grid',
    choices: [
      {
        id: 'ration',
        label: 'Reduce demand',
        detail: 'Pause nonessential equipment to protect core systems.',
        consequence: 'Core systems remain reliable; expansion proceeds more slowly.',
      },
      {
        id: 'storage',
        label: 'Build storage',
        detail: 'Smooth peaks, accepting material and maintenance costs.',
        requires: 'energy-storage',
        consequence: 'Peak demand is easier to meet; materials and maintenance now matter more.',
      },
    ],
  },
  {
    id: 'production-bottleneck',
    title: 'A production bottleneck',
    description: 'A part is needed faster than the workshop can repeat it. How will you respond?',
    afterSessions: 3,
    requiredSystem: 'manufacturing',
    choices: [
      {
        id: 'focus',
        label: 'Narrow the build',
        detail: 'Prioritize one component and delay the rest.',
        consequence: 'The urgent part arrives; other projects wait.',
      },
      {
        id: 'automate',
        label: 'Automate a step',
        detail: 'Improve repeatability, accepting setup effort.',
        requires: 'automation',
        consequence: 'Repeatability improves after an initial investment of time and oversight.',
      },
    ],
  },
  {
    id: 'research-priority',
    title: 'A question worth funding',
    description: 'The laboratory has time for one serious experiment. Choose what to learn next.',
    afterSessions: 5,
    requiredSystem: 'research-lab',
    choices: [
      {
        id: 'measurement',
        label: 'Improve measurement',
        detail: 'Reduce uncertainty before a larger test.',
        consequence: 'The next result will be clearer, although the schedule grows.',
      },
      {
        id: 'compute',
        label: 'Model first',
        detail: 'Explore possibilities in simulation before building.',
        requires: 'classical-computing',
        consequence: 'Simulation narrows the design space; its assumptions still need testing.',
      },
    ],
  },
];
export function availableChallenges(data: Snapshot): Challenge[] {
  const sessions = data.sessions.filter((s) => !s.demo && s.durationMs >= 10 * 60000).length;
  return challenges.filter((c) => {
    const threshold =
      data.civilization.eventFrequency === 'rare' ? c.afterSessions * 2 : c.afterSessions;
    const system = data.civilization.systems.find((s) => s.id === c.requiredSystem);
    return (
      sessions >= threshold &&
      system &&
      capabilityState(system, data.topics) !== 'unknown' &&
      !data.civilization.decisions.some((d) => d.id === c.id)
    );
  });
}

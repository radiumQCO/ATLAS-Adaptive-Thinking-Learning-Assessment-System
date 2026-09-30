import { emptySnapshot, type Snapshot } from './model';
export function createDemo(now = Date.now()): Snapshot {
  const s = emptySnapshot();
  s.settings.createdAt = now;
  s.subjects = [
    ['math', 'Mathematics', '#c28b35'],
    ['physics', 'Physics', '#668495'],
    ['chemistry', 'Chemistry', '#aa7589'],
    ['quantum', 'Quantum Computing', '#8b82b3'],
    ['code', 'Programming', '#659488'],
  ].map(([id, name, color]) => ({ id, name, color, demo: true }));
  s.countries = s.subjects
    .filter((x) => ['math', 'quantum', 'code'].includes(x.id))
    .map((x) => ({ ...x, id: `country-${x.id}` }));
  const names = [
    ['QAOA', 'quantum'],
    ['VQE', 'quantum'],
    ['ZZ', 'quantum'],
    ['SWAP', 'quantum'],
    ['2Q Gate', 'quantum'],
    ['Routing', 'quantum'],
    ['Parity Encoding', 'quantum'],
    ['Decoding', 'quantum'],
    ['Hamiltonian', 'quantum'],
    ['Ansatz', 'quantum'],
    ['Measurements', 'quantum'],
    ['Symmetry', 'quantum'],
    ['Matrix', 'math'],
    ['Vector', 'math'],
    ['Graph', 'math'],
    ['Function', 'math'],
    ['Python', 'code'],
    ['Function', 'code'],
    ['Loop', 'code'],
    ['Dictionary', 'code'],
  ];
  s.topics = names.map(([name, subjectId], i) => ({
    id: `demo-${i}`,
    name,
    subjectId,
    mastery: ([1, 2, 3, 1, 2, 0, 0, 1, 2, 2, 3, 0, 3, 2, 1, 0, 2, 0, 3, 1] as const)[i],
    explanation:
      (
        {
          1: 'A hybrid quantum–classical method for finding the lowest energy of a system.\n\nA quantum circuit prepares a trial state. A classical optimizer adjusts its parameters to minimize the measured energy.',
          4: 'An operation involving **two qubits**. Unlike independent one-qubit gates, a two-qubit gate can create entanglement.',
          9: 'A parameterized guess for a quantum state.\n\nIn VQE, the ansatz is the circuit structure that we tune to approximate the ground state.',
          12: 'A rectangular arrangement of numbers that represents a linear transformation.',
        } as Record<number, string>
      )[i] ?? '',
    examples:
      i === 9
        ? 'A rotation layer followed by entangling gates. The rotation angles are the parameters.'
        : '',
    notes:
      i === 1
        ? 'Start with a two-qubit system. Understand the role of the ansatz before adding more depth.'
        : '',
    parentId:
      i === 9 || i === 8 || i === 10
        ? 'demo-1'
        : i === 17 || i === 18 || i === 19
          ? 'demo-16'
          : null,
    createdAt: now - 21 * 86400000 + i * 1000,
    understoodAt: [2, 3].includes([1, 2, 3, 1, 2, 0, 0, 1, 2, 2, 3, 0, 3, 2, 1, 0, 2, 0, 3, 1][i])
      ? now - 3 * 86400000
      : null,
    lastTestedAt: [2, 10, 12, 18].includes(i) ? now - 2 * 86400000 : null,
    order: i,
    demo: true,
  }));
  const positions: [[number, number, number, string], ...[number, number, number, string][]] = [
    [1, 0, 0, 'quantum'],
    [9, 1, 0, 'quantum'],
    [8, 0, 1, 'quantum'],
    [4, 1, 1, 'quantum'],
    [2, 2, 1, 'quantum'],
    [10, 0, 2, 'quantum'],
    [12, 4, -1, 'math'],
    [13, 5, -1, 'math'],
    [14, 4, 0, 'math'],
    [15, 5, 0, 'math'],
    [16, 4, 3, 'code'],
    [18, 5, 3, 'code'],
    [19, 4, 4, 'code'],
  ];
  s.nodes = positions.map(([i, x, y, c]) => ({
    id: `node-${i}`,
    topicId: `demo-${i}`,
    x,
    y,
    countryId: `country-${c}`,
    demo: true,
  }));
  s.relations = [
    { id: 'rel-1', fromId: 'demo-1', toId: 'demo-9', kind: 'prerequisite', demo: true },
    { id: 'rel-2', fromId: 'demo-9', toId: 'demo-4', kind: 'prerequisite', demo: true },
    { id: 'rel-3', fromId: 'demo-8', toId: 'demo-12', kind: 'prerequisite', demo: true },
  ];
  for (let d = 20; d >= 0; d--) {
    if ([18, 13, 7].includes(d)) continue;
    const start = new Date(now);
    start.setDate(start.getDate() - d);
    start.setHours(d === 0 ? 9 : 14, 10, 0, 0);
    const ms = (35 + ((d * 17) % 105)) * 60000;
    const topicId = ['demo-1', 'demo-12', 'demo-16'][d % 3];
    const begin = Math.min(start.getTime(), now - ms);
    s.sessions.push({
      id: `session-${d}`,
      topicId,
      subtopicId: topicId === 'demo-1' ? 'demo-9' : null,
      startedAt: begin,
      endedAt: begin + ms,
      durationMs: ms,
      segments: [{ start: begin, end: begin + ms }],
      note: d % 3 === 0 ? 'Worked through a small example and wrote down my understanding.' : '',
      demo: true,
    });
  }
  s.tests = [2, 10, 12, 18].map((i) => ({
    id: `test-${i}`,
    topicId: `demo-${i}`,
    date: now - 2 * 86400000,
    result: 'pass',
    response: 'Reconstructed the idea and checked it with a small example.',
    demo: true,
  }));
  return s;
}

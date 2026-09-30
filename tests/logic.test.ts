import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createDemo } from '../src/lib/demo';
import { placement, canParent } from '../src/lib/map';
import { emptySnapshot, validateSnapshot } from '../src/lib/model';
import {
  capabilityState,
  defaultCivilization,
  linkedTopics,
  territoryProfile,
} from '../src/lib/civilization';
import { dayKey, getStats, remaining, splitByDay } from '../src/lib/time';

describe('knowledge model', () => {
  it('opens a genuinely empty notebook and upgrades legacy snapshots', () => {
    const fresh = emptySnapshot();
    expect(fresh.topics).toEqual([]);
    expect(fresh.subjects).toEqual([]);
    expect(fresh.sessions).toEqual([]);
    expect(fresh.tests).toEqual([]);
    expect(fresh.civilization.decisions).toEqual([]);
    const old = createDemo();
    const legacy = { ...old, schemaVersion: 1, civilization: undefined };
    expect(validateSnapshot(legacy).topics).toHaveLength(old.topics.length);
    expect(validateSnapshot(legacy).civilization).toEqual(defaultCivilization());
  });
  it('keeps all four mastery states and rejects invalid references', () => {
    const demo = createDemo();
    expect(new Set(demo.topics.map((t) => t.mastery))).toEqual(new Set([0, 1, 2, 3]));
    expect(validateSnapshot(demo).topics).toHaveLength(demo.topics.length);
    const broken = structuredClone(demo);
    broken.topics[0].subjectId = 'missing';
    expect(() => validateSnapshot(broken)).toThrow(/subject reference/i);
  });

  it('rejects parent cycles and inherits only orthogonal neighboring countries', () => {
    const demo = createDemo();
    const child = demo.topics.find((t) => t.parentId);
    expect(child).toBeDefined();
    expect(canParent(demo, child!.parentId!, child!.id)).toBe(false);
    const topic = demo.topics[0].id;
    const nodes = [{ id: 'a', topicId: topic, x: 0, y: 0, countryId: 'math', demo: false }];
    expect(placement(nodes, 'another', 1, 0).countries).toEqual(['math']);
    expect(placement(nodes, 'another', 1, 1).countries).toEqual([]);
    expect(placement(nodes, 'another', 0, 0).occupied).toBe(true);
  });
});

describe('civilization', () => {
  it('requires real topic mastery and links by stable topic IDs', () => {
    const data = emptySnapshot();
    const system = data.civilization.systems.find((s) => s.id === 'electric-grid')!;
    expect(capabilityState(system, data.topics)).toBe('unknown');
    data.subjects.push({ id: 's', name: 'Physics', color: '#668495', demo: false });
    for (const name of ['Electricity', 'Voltage', 'Current'])
      data.topics.push({
        id: name,
        name,
        subjectId: 's',
        parentId: null,
        mastery: 2,
        explanation: '',
        examples: '',
        notes: '',
        createdAt: 1,
        understoodAt: 1,
        lastTestedAt: null,
        order: 0,
        demo: false,
      });
    expect(capabilityState(system, data.topics)).toBe('experimental');
    system.requirements[0].minMastery = 3;
    expect(capabilityState(system, data.topics)).toBe('learning');
    for (const topic of data.topics) topic.mastery = 3;
    expect(capabilityState(system, data.topics)).toBe('stable');
    system.requirements[0].topicIds = ['Electricity'];
    data.topics[0].name = 'Electrical circuits';
    expect(linkedTopics(system.requirements[0], data.topics)[0].id).toBe('Electricity');
    expect(capabilityState(system, data.topics)).toBe('stable');
  });
  it('keeps map area and knowledge level separate, including project experience', () => {
    const data = emptySnapshot();
    data.subjects.push({ id: 'math-subject', name: 'Mathematics', color: '#668495', demo: false });
    data.subjects.push({
      id: 'quantum-subject',
      name: 'Quantum Computing',
      color: '#745b9d',
      demo: false,
    });
    data.countries.push({ id: 'math', name: 'Mathematics', color: '#668495', demo: false });
    data.countries.push({
      id: 'quantum',
      name: 'Quantum Computing',
      color: '#745b9d',
      demo: false,
    });
    const add = (name: string, country: 'math' | 'quantum', index: number, mastery: 2 | 3) => {
      data.topics.push({
        id: name,
        name,
        subjectId: `${country}-subject`,
        parentId: null,
        mastery,
        explanation: '',
        examples: '',
        notes: '',
        createdAt: 1,
        understoodAt: 1,
        lastTestedAt: null,
        order: index,
        demo: false,
      });
      data.nodes.push({
        id: `node-${name}`,
        topicId: name,
        x: country === 'math' ? index : 100 + index,
        y: 0,
        countryId: country,
        demo: false,
      });
    };
    for (let i = 0; i < 12; i++) add(`Math ${i}`, 'math', i, 2);
    add('Linear Algebra', 'math', 12, 2);
    [
      'Qubits',
      'Quantum Gates',
      'QAOA',
      'Optimization',
      'Quantum Routing',
      'Quantum Circuits',
      'Quantum Error Correction',
      'VQE',
      'Quantum Measurement',
    ].forEach((name, index) => add(name, 'quantum', index, 3));
    const math = territoryProfile(data, 'math');
    const quantum = territoryProfile(data, 'quantum');
    expect(math.size).toBeGreaterThan(quantum.size);
    expect(quantum.completedProjects.map((project) => project.id)).toContain('qaoa-router');
    expect(quantum.experience).toBeGreaterThan(math.experience);
    expect(quantum.level).toBeGreaterThan(math.level);
  });
});

describe('study time', () => {
  it('counts down across pauses and migrates an active older timer', () => {
    const data = createDemo();
    const start = Date.now();
    data.timer = {
      id: 'active',
      topicId: data.topics[0].id,
      subtopicId: null,
      targetMs: 60_000,
      startedAt: start,
      runningSince: start + 20_000,
      segments: [{ start, end: start + 10_000 }],
      note: '',
    };
    expect(remaining(data.timer, start + 30_000)).toBe(40_000);
    const legacy = structuredClone(data) as unknown as { timer: Record<string, unknown> };
    delete legacy.timer.targetMs;
    expect(validateSnapshot(legacy).timer?.targetMs).toBe(25 * 60_000);
  });
  it('splits segments at local midnight', () => {
    const start = new Date(2026, 8, 29, 23, 45).getTime();
    const end = new Date(2026, 8, 30, 0, 15).getTime();
    const parts = splitByDay([{ start, end }]);
    expect(parts.get(dayKey(start))).toBe(15 * 60_000);
    expect(parts.get(dayKey(end))).toBe(15 * 60_000);
  });

  it('does not count future imported sessions in current totals', () => {
    const now = new Date(2026, 8, 29, 12).getTime();
    const later = now + 86_400_000;
    const stats = getStats(
      [
        {
          id: 'future',
          topicId: 't',
          subtopicId: null,
          startedAt: later,
          endedAt: later + 3_600_000,
          durationMs: 3_600_000,
          segments: [{ start: later, end: later + 3_600_000 }],
          note: '',
          demo: false,
        },
      ],
      now,
    );
    expect(stats.today).toBe(0);
    expect(stats.total).toBe(0);
    expect(stats.currentStreak).toBe(0);
  });
});

describe('backup format', () => {
  it('round trips and rejects checksum corruption', async () => {
    const { envelope, decodeBackup } = await import('../src/db/storage');
    const backup = await envelope(createDemo());
    expect((await decodeBackup(JSON.stringify(backup))).snapshot.topics.length).toBeGreaterThan(0);
    const tampered = { ...backup, snapshot: { ...backup.snapshot, topics: [] } };
    await expect(decodeBackup(JSON.stringify(tampered))).rejects.toThrow(/checksum/i);
  });
});

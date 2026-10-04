import type { RetentionTest, Snapshot } from './model';
import { dateLabel, dayKey, parseDay } from './time';

export function testDays(tests: RetentionTest[]) {
  const days = new Map<string, RetentionTest[]>();
  for (const test of tests) {
    const day = dayKey(test.date);
    const entries = days.get(day) ?? [];
    entries.push(test);
    days.set(day, entries);
  }
  return [...days]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, entries]) => ({
      day,
      tests: entries.sort((a, b) => a.date - b.date || a.id.localeCompare(b.id)),
    }));
}

export function createTestExport(data: Pick<Snapshot, 'topics' | 'tests'>, day: string) {
  const entries = testDays(data.tests).find((entry) => entry.day === day)?.tests;
  if (!entries?.length) throw new Error('There are no saved tests on this date.');
  const names = new Map(data.topics.map((topic) => [topic.id, topic.name]));
  const date = dateLabel(parseDay(day).getTime(), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const header = [
    'ATLAS — Weekly test',
    `Test day: ${date} (${day})`,
    `Saved answers: ${entries.length}`,
    'Source: Recall notes written during the Weekly test.',
    'Results below are self-assessments by the learner.',
  ].join('\n');
  const answers = entries.map((test, index) =>
    [
      `${index + 1}. Topic: ${names.get(test.topicId) ?? 'Unknown topic'}`,
      `Tested at: ${dateLabel(test.date, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`,
      `Self-assessment: ${test.result === 'pass' ? 'Passed' : 'Needs review'}`,
      'Recall answer:',
      // Only the saved test answer belongs here. Checklist explanations change over time.
      test.response.trim() ? test.response : '[No recall notes were written for this test.]',
    ].join('\n'),
  );
  return {
    filename: `ATLAS-weekly-test-${day}.txt`,
    body: `${header}\n\n${answers.join('\n\n----------------------------------------\n\n')}\n`,
  };
}

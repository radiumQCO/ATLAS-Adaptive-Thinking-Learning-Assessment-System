import type { MapNode, Snapshot } from './model';
export const CELL = 96;
export function placement(nodes: MapNode[], topicId: string, x: number, y: number) {
  const others = nodes.filter((n) => n.topicId !== topicId);
  if (others.some((n) => n.x === x && n.y === y))
    return { occupied: true, countries: [] as string[] };
  const countries = [
    ...new Set(
      others
        .filter((n) => Math.abs(n.x - x) + Math.abs(n.y - y) === 1)
        .map((n) => n.countryId)
        .filter((x): x is string => !!x),
    ),
  ];
  return { occupied: false, countries };
}
export function canParent(data: Snapshot, topicId: string, parentId: string | null) {
  const seen = new Set([topicId]);
  let p = parentId;
  while (p) {
    if (seen.has(p)) return false;
    seen.add(p);
    p = data.topics.find((t) => t.id === p)?.parentId ?? null;
  }
  return true;
}

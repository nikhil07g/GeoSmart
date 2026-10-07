import { haversineMeters } from "./constants";

export interface Stop {
  id: string;
  title: string;
  lat: number;
  lng: number;
}

/**
 * A* search over a fully connected graph of collection stops.
 * State = (current stop, set of visited stops); heuristic = minimum spanning
 * distance estimate to the remaining stops. Falls back to nearest-neighbour +
 * 2-opt above 10 stops so the endpoint stays responsive. The module is kept
 * separate so it can later be swapped for a commercial routing API.
 */
export function optimizeStops(start: Stop, stops: Stop[]) {
  if (stops.length === 0) {
    return { order: [] as Stop[], distanceMeters: 0, algorithm: "empty" };
  }
  const order = stops.length <= 9 ? aStarOrder(start, stops) : nearestNeighbourTwoOpt(start, stops);
  return {
    order,
    distanceMeters: pathLength(start, order),
    algorithm: stops.length <= 9 ? "a-star" : "nearest-neighbour+2opt",
  };
}

function dist(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return haversineMeters(a, b);
}

function pathLength(start: Stop, order: Stop[]) {
  let total = 0;
  let prev: Stop = start;
  for (const s of order) {
    total += dist(prev, s);
    prev = s;
  }
  return Math.round(total);
}

function heuristic(current: Stop, remaining: Stop[]) {
  if (remaining.length === 0) return 0;
  // Optimistic estimate: nearest unvisited hop + spread of the remaining set.
  const nearest = Math.min(...remaining.map((s) => dist(current, s)));
  const spread = remaining.length > 1
    ? Math.max(...remaining.map((a) => Math.min(...remaining.filter((b) => b !== a).map((b) => dist(a, b)))))
    : 0;
  return nearest + spread * (remaining.length - 1) * 0.5;
}

function aStarOrder(start: Stop, stops: Stop[]): Stop[] {
  interface Node {
    at: Stop;
    visited: number;
    g: number;
    f: number;
    path: Stop[];
  }
  const all = 1 << stops.length;
  const open: Node[] = [
    { at: start, visited: 0, g: 0, f: heuristic(start, stops), path: [] },
  ];
  const best = new Map<string, number>();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const node = open.shift()!;
    if (node.visited === all - 1) return node.path;

    for (let i = 0; i < stops.length; i++) {
      if (node.visited & (1 << i)) continue;
      const next = stops[i]!;
      const g = node.g + dist(node.at, next);
      const visited = node.visited | (1 << i);
      const key = `${i}:${visited}`;
      if ((best.get(key) ?? Infinity) <= g) continue;
      best.set(key, g);
      const remaining = stops.filter((_, j) => !(visited & (1 << j)));
      open.push({ at: next, visited, g, f: g + heuristic(next, remaining), path: [...node.path, next] });
    }
  }
  return stops;
}

function nearestNeighbourTwoOpt(start: Stop, stops: Stop[]): Stop[] {
  const pool = [...stops];
  const order: Stop[] = [];
  let current: Stop = start;
  while (pool.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    pool.forEach((s, i) => {
      const d = dist(current, s);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    current = pool.splice(bestIdx, 1)[0]!;
    order.push(current);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (pathLength(start, candidate) + 1 < pathLength(start, order)) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return order;
}

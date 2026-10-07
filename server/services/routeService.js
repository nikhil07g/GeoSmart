/** Order geolocated service stops with A* for up to twelve waypoints. The
 * nearest-neighbour fallback bounds work for longer routes while keeping the
 * service contract ready for a road-network routing provider. */
export function distanceKm(a, b) {
  const r = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function optimizeWaypoints(start, stops) {
  if (stops.length > 12) {
    const order = [];
    const left = [...stops];
    let at = start;
    while (left.length) {
      let best = 0;
      for (let i = 1; i < left.length; i++) {
        if (
          distanceKm(at, [left[i].latitude, left[i].longitude]) <
          distanceKm(at, [left[best].latitude, left[best].longitude])
        )
          best = i;
      }
      const next = left.splice(best, 1)[0];
      order.push(next);
      at = [next.latitude, next.longitude];
    }
    return { ordered: order, algorithm: "Nearest-neighbour heuristic fallback" };
  }
  const n = stops.length;
  const goal = (1 << n) - 1;
  const queue = [{ mask: 0, last: -1, cost: 0, order: [] }];
  const best = new Map([["0:-1", 0]]);
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (current.mask === goal) return { ordered: current.order, algorithm: "A* waypoint search" };
    const at =
      current.last < 0 ? start : [stops[current.last].latitude, stops[current.last].longitude];
    for (let i = 0; i < n; i++) {
      if (current.mask & (1 << i)) continue;
      const point = [stops[i].latitude, stops[i].longitude];
      const mask = current.mask | (1 << i);
      const cost = current.cost + distanceKm(at, point);
      const key = `${mask}:${i}`;
      if (cost >= (best.get(key) ?? Infinity)) continue;
      best.set(key, cost);
      queue.push({ mask, last: i, cost, order: [...current.order, stops[i]] });
    }
  }
  return { ordered: stops, algorithm: "A* waypoint search" };
}

class OptimizedNodeManager {
  constructor() {
    this.nodeCoords = [];
    this.nodeImportance = [];
    this.pathSegments = new Map();
    this.coordToNode = new Map();
    this.nodeCount = 0;
    this.importantNodeIds = [];
    this.trafficLights = new Set();
  }

  getOrCreateNode(lat, lon) {
    const key = `${lat},${lon}`;

    if (this.coordToNode.has(key)) {
      return this.coordToNode.get(key);
    }

    const nodeId = this.nodeCount++;
    this.coordToNode.set(key, nodeId);
    this.nodeCoords[nodeId] = [lat, lon];
    this.nodeImportance[nodeId] = false;

    return nodeId;
  }

  markTrafficLight(nodeId) {
    this.trafficLights.add(nodeId);
    this.markImportant(nodeId);
  }

  hasTrafficLight(nodeId) {
    return this.trafficLights.has(nodeId);
  }

  markImportant(nodeId) {
    if (!this.nodeImportance[nodeId]) {
      this.nodeImportance[nodeId] = true;
      this.importantNodeIds.push(nodeId);
    }
  }

  addSegment(fromId, toId, coords) {
    this.pathSegments.set(`${fromId},${toId}`, coords);
  }

  getSegment(fromId, toId) {
    return this.pathSegments.get(`${fromId},${toId}`);
  }
}

function mergeRoads(roads) {
  const merged = [];
  const visited = new Set();

  // if such a bucket was not created, create it
  // if such a bucker was created, add the road to it
  // after loop finishes, all the roads are divided into buckets of same attributes
  const buckets = new Map();
  for (const road of roads) {
    const key = `${road.oneway}|${road.hgv}|${road.maxspeed}|${road.maxweight}|${road.maxheight}|${road.maxwidth}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(road);
  }

  for (const [key, group] of buckets.entries()) {
    const startIndex = new Map();
    const endIndex = new Map();

    for (const road of group) {
      // get the first and the last node of the road
      const start = road.nodes.at(0);
      const end = road.nodes.at(-1);

      // group roads by their start and end nodes
      if (!startIndex.has(start)) startIndex.set(start, []);
      if (!endIndex.has(end)) endIndex.set(end, []);
      startIndex.get(start).push(road);
      endIndex.get(end).push(road);
    }

    for (const road of group) {
      if (visited.has(road)) continue;
      visited.add(road);

      let coords = [...road.coords];
      let nodes = [...road.nodes];

      let combined = { ...road };

      // merge forward
      let current = road;

      while (true) {
        const endNode = nodes.at(-1);

        // the road that starts after the current visited road ends
        const nextCandidates = startIndex.get(endNode) || [];

        // find a road within candidates that is not visited yet
        const next = nextCandidates.find(road => !visited.has(road));
        if (!next) break;
        visited.add(next);

        // cut the start of the next road cause this is how the current road ends
        coords.push(...next.coords.slice(1));
        nodes.push(...next.nodes.slice(1));

        combined = mergeAttributes(combined, next);
        current = next;
      }

      // merge backward
      current = road;
      while (true) {
        const startNode = nodes.at(0);
        const prevCandidates = endIndex.get(startNode) || [];
        const prev = prevCandidates.find(road => !visited.has(road));
        if (!prev) break;
        visited.add(prev);

        coords.unshift(...prev.coords.slice(0, -1));
        nodes.unshift(...prev.nodes.slice(0, -1));

        combined = mergeAttributes(combined, prev);
        current = prev;
      }

      // update the array of merged roads with the new merged road
      merged.push({
        ...combined,
        coords,
        nodes,
      });
    }
  }

  return merged;
}

function mergeAttributes(r1, r2) {
  return {
    ...r1,
    lanes: Math.min(r1.lanes ?? Infinity, r2.lanes ?? Infinity),
    maxspeed: Math.min(r1.maxspeed ?? Infinity, r2.maxspeed ?? Infinity),
    maxweight: Math.min(r1.maxweight ?? Infinity, r2.maxweight ?? Infinity),
    maxheight: Math.min(r1.maxheight ?? Infinity, r2.maxheight ?? Infinity),
    maxwidth: Math.min(r1.maxwidth ?? Infinity, r2.maxwidth ?? Infinity),
    hgv: (r1.hgv === "no" || r2.hgv === "no") ? "no" : "yes",
    oneway: (r1.oneway === "yes" || r2.oneway === "yes") ? "yes" : "no"
  };
}

module.exports = { OptimizedNodeManager, mergeRoads };

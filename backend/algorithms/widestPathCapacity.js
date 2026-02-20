const MinHeap = require("./MinHeap");

function widestPathCapacity(graph, startId, endId, mode) {
  const best = new Map();
  const pq = new MinHeap();

  best.set(startId, Infinity);
  pq.enqueue(startId, -Infinity);

  while (!pq.isEmpty()) {
    const u = pq.dequeue();
    const cap = best.get(u);

    if (u === endId) return cap;

    for (const nb of graph.adj.get(u) || []) {
      const edge = graph.edgeMap.get(`${u},${nb.nodeId}`);
      if (!edge) continue;
      let eCap;
      switch (mode) {
        case "speed": eCap = edge.weights.maxspeed; break;
        case "weight": eCap = edge.weights.maxweight; break;
        case "height": eCap = edge.weights.maxheight; break;
        case "width": eCap = edge.weights.maxwidth; break;
        case "hgv": eCap = edge.weights.curvature; break;
        default: eCap = Infinity;
      }
      const pathCap = Math.min(cap, eCap);

      if ((best.get(nb.nodeId) || -Infinity) < pathCap) {
        best.set(nb.nodeId, pathCap);
        pq.enqueue(nb.nodeId, -pathCap);
      }
    }
  }

  return 0;
}

module.exports = { widestPathCapacity };
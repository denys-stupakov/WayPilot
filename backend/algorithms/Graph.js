class Graph {
  constructor(vertexCount) {
    this.vertexCount = vertexCount
    this.adj = new Map();
    this.edgeMap = new Map()
  }

  addEdge(from, to, distance, roadId, weights, coords, tags = {}) {
    const edge = { from, to, distance, weights, roadId, coords, tags };
    this.edgeMap.set(`${from},${to}`, edge);

    if (!this.adj.has(from)) this.adj.set(from, []);
    this.adj.get(from).push({
      nodeId: edge.to,
      distance: edge.distance,
      weights: edge.weights
    });
  }
}

module.exports = Graph;

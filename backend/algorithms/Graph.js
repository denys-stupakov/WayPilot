class Edge {
  constructor(from, to, distance, roadId, weight, coords) {
    this.to = to
    this.from = from
    this.distance = distance
    this.roadId = roadId
    this.weight = weight
    this.coords = coords
  }
}

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

  getSortedEdges(ascending = true) {
    return [...this.edges].sort((a, b) =>
      ascending ? a.weight - b.weight : b.weight - a.weight
    );
  }

  getSmallestWeight() {
    return this.getSortedEdges()[0].weight
  }
}

module.exports = Graph;
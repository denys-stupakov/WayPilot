const fastHaversine = require("./fastHaversine");
const MinHeap = require("./MinHeap");

// ============================================================================
// Constants
// ============================================================================

const MAX_POSSIBLE_SPEED = 130; // km/h

const TRAFFIC_LIGHT_WAIT_TIMES = {
  motorway: 10,
  trunk: 10,
  primary: 60,
  secondary: 40,
  tertiary: 25,
  residential: 20,
  living_street: 15,
  service: 10,
  track: 10,
  unclassified: 20
};

const DEFAULT_WAIT_TIME = 30;

// ============================================================================
// Utility Functions
// ============================================================================

function kmhToMs(speedKmh) {
  return (speedKmh * 1000) / 3600;
}

function calculateDistanceHeuristic(fromCoords, toCoords) {
  return fastHaversine(
    fromCoords[0], fromCoords[1],
    toCoords[0], toCoords[1]
  );
}

function calculateTimeHeuristic(fromCoords, toCoords) {
  const distance = calculateDistanceHeuristic(fromCoords, toCoords);
  return distance / kmhToMs(MAX_POSSIBLE_SPEED);
}

function calculateSegmentTime(distance, maxspeed) {
  return distance / kmhToMs(maxspeed || 50);
}

function getTrafficLightDelay(edge) {
  const highway = edge.tags?.highway || "unclassified";
  const wait = TRAFFIC_LIGHT_WAIT_TIMES[highway] ?? DEFAULT_WAIT_TIME;
  return wait / 2; // EXPECTED delay
}

// ============================================================================
// Routing Profiles
// ============================================================================

const PROFILES = {
  shortest: {
    cost(edge) {
      return edge.distance;
    },
    heuristic(from, to) {
      return calculateDistanceHeuristic(from, to);
    }
  },

  fastest: {
    cost(edge) {
      return edge.distance / kmhToMs(edge.weights?.maxspeed || 50);
    },
    heuristic(from, to) {
      return calculateTimeHeuristic(from, to);
    }
  },

  avoidTrafficLights: {
    cost(edge, nodeManager, toNode) {
      let time =
        edge.distance / kmhToMs(edge.weights?.maxspeed || 50);

      if (nodeManager.hasTrafficLight(toNode)) {
        time += getTrafficLightDelay(edge);
      }
      return time;
    },
    heuristic(from, to) {
      return calculateTimeHeuristic(from, to);
    }
  },

  hgv: {
    cost(edge) {
      return edge.distance;
    },
    heuristic(from, to) {
      return calculateDistanceHeuristic(from, to);
    },
    canTraverse(edge, ctx) {
      const edgeRadius = edge.weights?.minRadius ?? Infinity;
      return edgeRadius >= ctx.vehicleMinRadius;
    }
  }
};

// ============================================================================
// Unified A* Algorithm
// ============================================================================

function astar(
  graph,
  nodeManager,
  startNodeId,
  goalNodeId,
  { profile = "shortest", vehicleLength = 20 } = {}
) {
  const startCoords = nodeManager.nodeCoords[startNodeId];
  const goalCoords = nodeManager.nodeCoords[goalNodeId];
  if (!startCoords || !goalCoords) return null;

  const routingProfile = PROFILES[profile];
  if (!routingProfile) {
    throw new Error(`Unknown routing profile: ${profile}`);
  }

  const ctx = {
    vehicleMinRadius: vehicleLength * 0.6
  };

  const openSet = new MinHeap();
  const closedSet = new Set();
  const gScore = new Map();
  const cameFrom = new Map();

  gScore.set(startNodeId, 0);
  openSet.enqueue(
    startNodeId,
    routingProfile.heuristic(startCoords, goalCoords)
  );

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();

    if (current === goalNodeId) {
      return reconstructPath(current, cameFrom, graph, nodeManager);
    }

    closedSet.add(current);

    const neighbors = graph.adj.get(current) || [];

    for (const { nodeId: neighborId, distance } of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const edge = graph.edgeMap.get(`${current},${neighborId}`);
      if (!edge) continue;

      if (
        routingProfile.canTraverse &&
        !routingProfile.canTraverse(edge, ctx)
      ) {
        continue;
      }

      const edgeCost = routingProfile.cost(
        { ...edge, distance },
        nodeManager,
        neighborId,
        ctx
      );

      const tentativeG = gScore.get(current) + edgeCost;

      if (!gScore.has(neighborId) || tentativeG < gScore.get(neighborId)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentativeG);

        const h = routingProfile.heuristic(
          nodeManager.nodeCoords[neighborId],
          goalCoords
        );

        openSet.updatePriority(neighborId, tentativeG + h);
      }
    }
  }

  return null;
}

// ============================================================================
// Path Reconstruction (REALISTIC ETA)
// ============================================================================

function reconstructPath(goalNode, cameFrom, graph, nodeManager) {
  const path = [];
  let node = goalNode;
  let totalDistance = 0;
  let totalTime = 0;

  while (node !== undefined) {
    path.unshift(node);
    const prev = cameFrom.get(node);

    if (prev !== undefined) {
      const edge = graph.edgeMap.get(`${prev},${node}`);
      if (edge) {
        totalDistance += edge.distance;

        totalTime += calculateSegmentTime(
          edge.distance,
          edge.weights?.maxspeed || 50
        );

        if (nodeManager.hasTrafficLight(node)) {
          totalTime += getTrafficLightDelay(edge);
        }
      }
    }
    node = prev;
  }

  const smoothPathCoords = [];

  for (let i = 0; i < path.length - 1; i++) {
    const segment = nodeManager.getSegment(path[i], path[i + 1]);
    if (segment) {
      for (let j = 0; j < segment.length - 1; j++) {
        smoothPathCoords.push(segment[j]);
      }
    }
  }

  smoothPathCoords.push(
    nodeManager.nodeCoords[path[path.length - 1]]
  );

  return {
    path,
    distance: totalDistance,
    time: totalTime,
    smoothPathCoords
  };
}

// ============================================================================

module.exports = astar;

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

// Smoothness penalty model
const SMOOTHNESS_PENALTY = {
  excellent: 1.0,
  good: 1.05,
  intermediate: 1.15,
  bad: 1.35,
  very_bad: 1.6,
  horrible: 2.0,
  very_horrible: 3.0,
  impassable: Infinity
};

const DEFAULT_SMOOTHNESS_FACTOR = 1.1;

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
  return wait / 2;
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

  weight: {
    cost(edge) {
      return edge.distance;
    },
    heuristic(from, to) {
      return calculateDistanceHeuristic(from, to);
    },
    canTraverse(edge, vehicleWeight) {
      if (edge.weights?.maxweight) {
        const maxWeight = parseFloat(edge.weights.maxweight);
        console.log(`skipped ${edge.weights.maxweight}`)
        return vehicleWeight <= maxWeight;
      }
      return true;
    }
  },


  smoothness: {
    cost(edge) {
      const baseTime = edge.distance;

      const smoothnessTag = edge.weights?.smoothness;
      const factor =
        SMOOTHNESS_PENALTY[smoothnessTag] ??
        DEFAULT_SMOOTHNESS_FACTOR;

      return baseTime * factor;
    },

    heuristic(from, to) {
      return calculateDistanceHeuristic(from, to);
    }
  },

  hgv: {
    cost(edge, nodeManager, toNode, vehicleWeight = 0) {
      const baseDistance = edge.distance;

      const highway = edge.tags?.highway;

      const highwayFactors = {
        motorway: 1.0,
        trunk: 1.05,
        primary: 1.15,
        secondary: 1.3,
        tertiary: 1.5,
        residential: 1.9,
        service: 2.2,
        living_street: 2.8,
        track: 4.0,
        unclassified: 1.6
      };

      const highwayFactor = highwayFactors[highway] ?? 1.7;

      let laneFactor = 1.0;

      if (edge.weights?.lanes) {
        const lanes = parseInt(edge.weights.lanes, 10);

        if (!isNaN(lanes) && lanes > 1) {
          laneFactor = Math.max(1.0, 1.1 - Math.min((lanes - 1) * 0.03, 0.1));
        }
      }

      return baseDistance * highwayFactor * laneFactor;
    },

    heuristic(from, to) {
      return calculateDistanceHeuristic(from, to);
    },

    canTraverse(edge, vehicleWeight) {
      if (edge.weights?.hgv === "no") {
        return false;
      }

      if (edge.weights?.maxweight) {
        const maxWeight = parseFloat(edge.weights.maxweight);
        console.log(`${vehicleWeight <= maxWeight}, ${edge.weights.maxweight}, ${vehicleWeight}`)
        return vehicleWeight <= maxWeight;
      }
      return true;
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
  { profile = "shortest", vehicleWeight = 0 } = {}
) {
  const startCoords = nodeManager.nodeToCoord[startNodeId];
  const goalCoords = nodeManager.nodeToCoord[goalNodeId];
  if (!startCoords || !goalCoords) return null;

  const routingProfile = PROFILES[profile];
  if (!routingProfile) {
    throw new Error(`Unknown routing profile: ${profile}`);
  }

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
        !routingProfile.canTraverse(edge, vehicleWeight)
      ) {
        continue;
      }

      const edgeCost = routingProfile.cost(
        { ...edge, distance },
        nodeManager,
        neighborId,
        vehicleWeight
      );

      const tentativeG = gScore.get(current) + edgeCost;

      if (!gScore.has(neighborId) || tentativeG < gScore.get(neighborId)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentativeG);

        const h = routingProfile.heuristic(
          nodeManager.nodeToCoord[neighborId],
          goalCoords
        );

        openSet.updatePriority(neighborId, tentativeG + h);
      }
    }
  }

  return null;
}

// ============================================================================
// Path Reconstruction
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
    nodeManager.nodeToCoord[path[path.length - 1]]
  );

  return {
    path,
    distance: totalDistance,
    time: totalTime,
    smoothPathCoords
  };
}

module.exports = astar;
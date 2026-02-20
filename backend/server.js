const express = require("express");
const cors = require("cors");
const fs = require("fs");
const readline = require("readline");

const Graph = require("./algorithms/Graph");
const astar = require("./algorithms/astar");
const fastHaversine = require("./algorithms/fastHaversine");
const { OptimizedNodeManager, mergeRoads } = require("./algorithms/nodes");
const { widestPathCapacity } = require("./algorithms/widestPathCapacity");
const calculateMinRadius = require("./algorithms/calculateMinRadius");
const kdt = require('kdt');

const app = express();
app.use(cors());
app.use(express.json());

let graph = null;
let nodes = null;

const highwayDefaults = {
  motorway: { maxspeed: 130, maxweight: 40, maxheight: 4.0, maxwidth: 2.6, lanes: 4, laneWidth: 3.75, hgv: "yes" },
  trunk: { maxspeed: 110, maxweight: 40, maxheight: 4.0, maxwidth: 2.6, lanes: 2, laneWidth: 3.5, hgv: "yes" },
  primary: { maxspeed: 90, maxweight: 40, maxheight: 4.0, maxwidth: 2.6, lanes: 2, laneWidth: 3.25, hgv: "yes" },
  secondary: { maxspeed: 70, maxweight: 20, maxheight: 4.0, maxwidth: 2.55, lanes: 2, laneWidth: 3.0, hgv: "yes" },
  tertiary: { maxspeed: 50, maxweight: 12, maxheight: 4.0, maxwidth: 2.55, lanes: 1, laneWidth: 3.0, hgv: "yes" },
  residential: { maxspeed: 30, maxweight: 7.5, maxheight: 3.8, maxwidth: 2.55, lanes: 1, laneWidth: 2.8, hgv: "yes" },
  service: { maxspeed: 25, maxweight: 3.5, maxheight: 3.5, maxwidth: 2.5, lanes: 1, laneWidth: 2.5, hgv: "yes" },
  track: { maxspeed: 20, maxweight: 3.5, maxheight: 3.5, maxwidth: 2.5, lanes: 1, laneWidth: 2.5, hgv: "yes" },
  unclassified: { maxspeed: 20, maxweight: 3.5, maxheight: 3.5, maxwidth: 2.5, lanes: 1, laneWidth: 2.75, hgv: "yes" },
  living_street: { maxspeed: 20, maxweight: 3.5, maxheight: 3.5, maxwidth: 2.5, lanes: 1, laneWidth: 2.75, hgv: "yes" }
};

let tree

async function parseOSM() {
  nodes = new OptimizedNodeManager();
  const usageCount = new Map();
  let parsed = [];

  const rl = readline.createInterface({
    input: fs.createReadStream("sk_roads_with_signals.ndjson"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const feature = JSON.parse(line);
      if (feature.geometry && feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));

        const nodeIds = coords.map((coord) => {
          const nodeId = nodes.getOrCreateNode(coord.lat, coord.lon);
          usageCount.set(nodeId, (usageCount.get(nodeId) || 0) + 1);
          return nodeId;
        });

        const highway = feature.properties?.highway;
        const maxspeed = feature.properties?.maxspeed || highwayDefaults[highway]?.maxspeed || 70;
        const maxweight = feature.properties?.maxweight || highwayDefaults[highway]?.maxweight || 7.5;
        const maxheight = feature.properties?.maxheight || highwayDefaults[highway]?.maxheight || 3.8;
        const maxwidth = feature.properties?.maxwidth || highwayDefaults[highway]?.maxwidth || 2.55;
        const lanes = feature.properties?.lanes || highwayDefaults[highway]?.lanes || 1;
        const hgv = feature.properties?.hgv || highwayDefaults[highway]?.hgv || "yes";
        const oneway = feature.properties?.oneway || "no";

        parsed.push({
          id: Math.random(),
          coords: coords.map((c) => [c.lat, c.lon]),
          nodes: nodeIds,
          highway,
          maxspeed,
          maxweight,
          maxheight,
          maxwidth,
          lanes,
          hgv,
          oneway
        });

      } else if (
        feature.geometry.type === "Point" &&
        feature.properties.highway === "traffic_signals"
      ) {
        const [lon, lat] = feature.geometry.coordinates;
        const nodeId = nodes.getOrCreateNode(lat, lon);
        nodes.markTrafficLight(nodeId);
      }
    } catch (e) {
      console.error("JSON parse error:", e);
    }
  }

  parsed = mergeRoads(parsed);

  parsed.forEach((road) => {
    nodes.markImportant(road.nodes.at(0));
    nodes.markImportant(road.nodes.at(-1));
    road.coords.forEach((coord, idx) => {
      if (usageCount.get(road.nodes[idx]) > 1) {
        nodes.markImportant(road.nodes[idx]);
      }
    });
  });

  return { parsed, usageCount, nodes };
}

function buildGraph(parsed, nodes) {
  let graph = new Graph(nodes.importantNodeIds.length);

  parsed.forEach((road) => {
    const importantInRoad = [];
    road.nodes.forEach((nodeId, idx) => {
      if (nodes.nodeImportance[nodeId]) {
        importantInRoad.push({ idx, nodeId });
      }
    });

    for (let i = 0; i < importantInRoad.length - 1; i++) {
      const start = importantInRoad[i];
      const end = importantInRoad[i + 1];
      const segment = road.coords.slice(start.idx, end.idx + 1);

      let dist = 0;
      for (let j = start.idx; j < end.idx; j++) {
        dist += fastHaversine(
          road.coords[j][0],
          road.coords[j][1],
          road.coords[j + 1][0],
          road.coords[j + 1][1]
        );
      }

      let minRadius = calculateMinRadius(segment);

      console.log(minRadius)

      nodes.addSegment(start.nodeId, end.nodeId, segment);
      graph.addEdge(
        start.nodeId,
        end.nodeId,
        dist,
        road.id,
        {
          lanes: road.lanes,
          maxspeed: road.maxspeed,
          maxweight: road.maxweight,
          maxheight: road.maxheight,
          maxwidth: road.maxwidth,
          hgv: road.hgv,
          minRadius
        },
        [
          road.coords[start.idx],
          road.coords[end.idx],
        ],
        { highway: road.highway }
      );

      if (road.oneway !== "yes") {
        nodes.addSegment(end.nodeId, start.nodeId, [...segment].reverse());
        graph.addEdge(
          end.nodeId,
          start.nodeId,
          dist,
          road.id,
          {
            lanes: road.lanes,
            maxspeed: road.maxspeed,
            maxweight: road.maxweight,
            maxheight: road.maxheight,
            maxwidth: road.maxwidth,
            hgv: road.hgv,
            minRadius
          },
          [
            road.coords[end.idx],
            road.coords[start.idx],
          ],
          { highway: road.highway }
        );
      }
    }
  });

  return graph;
}

async function loadGraph() {
  let { parsed, usageCount, nodes } = await parseOSM();

  const points = nodes.importantNodeIds.map(id => {
    const [lat, lon] = nodes.nodeCoords[id];
    return { lat, lon, id };
  });

  tree = kdt.createKdTree(points, (a, b) => fastHaversine(a.lat, a.lon, b.lat, b.lon), ['lat', 'lon']);

  graph = buildGraph(parsed, nodes);
}

const MAX_DISTANCE_METERS = 5000; // max distance from any road

function findNearest(lat, lon) {
  const result = tree.nearest({ lat, lon }, 1);
  if (!result || result.length === 0) return null;

  const nearest = result[0][0];
  const distance = fastHaversine(lat, lon, nearest.lat, nearest.lon);

  if (distance > MAX_DISTANCE_METERS) {
    return null; // too far, invalid stop
  }

  const [snappedLat, snappedLon] = nodes.nodeCoords[nearest.id];
  return { id: nearest.id, lat: snappedLat, lon: snappedLon };
}



app.get("/route-stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const stops = JSON.parse(req.query.stops);
  const { mode1 = "normal", mode2 = "trafficLights" } = req.query;
  const {vehicleLength} = req.query

  if (!Array.isArray(stops) || stops.length < 2) {
    res.write(`event: error\ndata: Invalid stops\n\n`);
    return res.end();
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i];
    const end = stops[i + 1];

    const startNearest = findNearest(start.lat, start.lng);
    const endNearest = findNearest(end.lat, end.lng);

    if (!startNearest || !endNearest) {
      // send an error event to client
      res.write(`event: error\ndata: ${JSON.stringify({
        type: "invalid_stop",
        message: "Stop too far from known roads",
        index: i
      })}\n\n`);

      continue; // skip this segment
    }

    const startId = startNearest.id;
    const endId = endNearest.id;

    // include snapped coordinates for client
    start.snapped = { lat: startNearest.lat, lng: startNearest.lon };
    end.snapped = { lat: endNearest.lat, lng: endNearest.lon };

    // --- Compute and send route1 ---
    const route1 = astar(graph, nodes, startId, endId, { mode: "shortest" }, 0);
    res.write(`event: route1\ndata: ${JSON.stringify({ index: i, route1, start, end })}\n\n`);

    // ⚡ Give Node time to flush the buffer before route2
    await new Promise(resolve => setImmediate(resolve));

    // --- Compute route2 (optional) ---
    let route2 = null;

    if (mode2 === "trafficLights") {
      route2 = astar(
        graph,
        nodes,
        startId,
        endId,
        { profile: "avoidTrafficLights" }
      );

    } else if (mode2 === "speed") {
      route2 = astar(
        graph,
        nodes,
        startId,
        endId,
        { profile: "fastest" }
      );

    } else if (mode2 === "hgv") {
      route2 = astar(
        graph,
        nodes,
        startId,
        endId,
        {
          profile: "hgv",
          vehicleLength: vehicleLength
        }
      );
    }

    res.write(
      `event: route2\ndata: ${JSON.stringify({
        index: i,
        route2,
        start,
        end
      })}\n\n`
    );

    await new Promise(resolve => setImmediate(resolve));
  }
  res.write("event: end\ndata: done\n\n");
  res.end();
});

const PORT = 3001;
loadGraph().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
  });
});
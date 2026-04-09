const express = require("express");
const cors = require("cors");
const astar = require("./algorithms/astar");
const fastHaversine = require("./algorithms/fastHaversine");
const buildGraph = require("./buildGraph");
const kdt = require('kdt');

const getRoads = require("./getRoads");

const app = express();
app.use(cors());
app.use(express.json());

let graph = null;
let nodes = null;
let tree = null;
let roads = null;

async function loadGraph() {
  const data = await getRoads();
  nodes = data.nodes;
  roads = data.roads;

  const points = nodes.importantNodeIds.map(id => {
    const [lat, lon] = nodes.nodeToCoord[id];
    return { lat, lon, id };
  });

  tree = kdt.createKdTree(points, (a, b) => fastHaversine(a.lat, a.lon, b.lat, b.lon), ['lat', 'lon']);

  graph = buildGraph(roads, nodes);
}

const MAX_DISTANCE_METERS = 5000;

function findNearest(lat, lon) {
  const result = tree.nearest({ lat, lon }, 1);
  if (!result || result.length === 0) return null;

  const nearest = result[0][0];
  const distance = fastHaversine(lat, lon, nearest.lat, nearest.lon);

  if (distance > MAX_DISTANCE_METERS) {
    return null; // too far, invalid stop
  }

  const [snappedLat, snappedLon] = nodes.nodeToCoord[nearest.id];
  return { id: nearest.id, lat: snappedLat, lon: snappedLon };
}

app.get("/route-stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const stops = JSON.parse(req.query.stops);
  const { mode1 = "normal", mode2 = "trafficLights", vehicleWeight = 0 } = req.query;

  console.log(vehicleWeight)

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
    const route1 = astar(graph, nodes, startId, endId, { profile: mode1, vehicleWeight: parseFloat(vehicleWeight) || 0 },);
    res.write(`event: route1\ndata: ${JSON.stringify({ index: i, route1, start, end })}\n\n`);

    // ⚡ Give Node time to flush the buffer before route2
    await new Promise(resolve => setImmediate(resolve));

    // --- Compute route2 (optional) ---
    let route2 = null;

    route2 = astar(
      graph,
      nodes,
      startId,
      endId,
      { profile: mode2, vehicleWeight: parseFloat(vehicleWeight) || 0 },
    );

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
  console.log("Graph is loaded, starting server...");
  app.listen(PORT, '0.0.0.0', () => {
  });
});
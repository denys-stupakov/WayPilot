import fs from "fs";
import readline from "readline";

// keep all your Graph, NodeManager, fastHaversine, mergeRoads code here…

// ------------------- Main -------------------
const inputFile = process.argv[2];
if (!inputFile) {
  console.error("❌ Usage: node preprocessor.js <file.ndjson>");
  process.exit(1);
}

console.log("🚀 Preprocessing:", inputFile);

// Stream reader
const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

const features = [];
let count = 0;

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const f = JSON.parse(line);
    features.push(f);
  } catch (err) {
    console.error("⚠️ Skipping bad line:", err.message);
  }
  count++;
  if (count % 100000 === 0) {
    console.log(`📦 Processed ${count} lines so far…`);
  }
});

rl.on("close", () => {
  console.log(`✅ Finished reading ${count} lines`);

  // now run the same processing as before
  const nodes = new OptimizedNodeManager();
  const usageCount = new Map();

  let parsed = features
    .filter(f => f.geometry && f.geometry.type === "LineString")
    .map(feature => {
      const coords = feature.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
      const nodeIds = coords.map(coord => {
        const nodeId = nodes.getOrCreateNode(coord.lat, coord.lon);
        usageCount.set(nodeId, (usageCount.get(nodeId) || 0) + 1);
        return nodeId;
      });
      return {
        id: feature.properties?.id || feature.id || Math.random(),
        coords: coords.map(c => [c.lat, c.lon]),
        tags: feature.properties || {},
        nodes: nodeIds
      };
    });

  console.log("Parsed drivable roads:", parsed.length);
  parsed = mergeRoads(parsed);
  console.log("Parsed merged roads:", parsed.length);

  parsed.forEach(road => {
    nodes.markImportant(road.nodes[0]);
    nodes.markImportant(road.nodes[road.nodes.length - 1]);
    road.coords.forEach((_, idx) => {
      if (usageCount.get(road.nodes[idx]) > 1) {
        nodes.markImportant(road.nodes[idx]);
      }
    });
  });

  console.log("Total nodes:", nodes.nodeCount);
  console.log("Important nodes:", nodes.importantNodeIds.length);

  // Build Graph
  const graph = new Graph(nodes.importantNodeIds.length);
  parsed.forEach(road => {
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
          road.coords[j][0], road.coords[j][1],
          road.coords[j + 1][0], road.coords[j + 1][1]
        );
      }

      nodes.addSegment(start.nodeId, end.nodeId, segment);
      graph.addEdge(start.nodeId, end.nodeId, dist, road.id, dist, [road.coords[start.idx], road.coords[end.idx]]);
      if (road.tags.oneway !== "yes") {
        nodes.addSegment(end.nodeId, start.nodeId, [...segment].reverse());
        graph.addEdge(end.nodeId, start.nodeId, dist, road.id, dist, [road.coords[end.idx], road.coords[start.idx]]);
      }
    }
  });

  console.log("Graph edges:", graph.edges.length);

  fs.writeFileSync("graph.json", JSON.stringify({
    nodes: nodes.nodeCoords,
    importantNodes: nodes.importantNodeIds,
    edges: graph.edges
  }));

  console.log("💾 Graph saved to graph.json");
});

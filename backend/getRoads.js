const { Nodes, mergeRoads } = require("./algorithms/nodes");
const fileSystem = require("fs");
const readline = require("readline");

const roadDefaultTags = {
  motorway: { maxspeed: 130, maxwidth: 2.6, lanes: 4, laneWidth: 3.75},
  trunk: { maxspeed: 110, maxwidth: 2.6, lanes: 2, laneWidth: 3.5},
  primary: { maxspeed: 90, maxwidth: 2.6, lanes: 2, laneWidth: 3.25},
  secondary: { maxspeed: 70, maxwidth: 2.55, lanes: 2, laneWidth: 3.0},
  tertiary: { maxspeed: 50, maxwidth: 2.55, lanes: 1, laneWidth: 3.0},
  residential: { maxspeed: 30,  maxwidth: 2.55, lanes: 1, laneWidth: 2.8},
  service: { maxspeed: 25,  maxwidth: 2.5, lanes: 1, laneWidth: 2.5},
  track: { maxspeed: 20,  maxwidth: 2.5, lanes: 1, laneWidth: 2.5},
  unclassified: { maxspeed: 20,  maxwidth: 2.5, lanes: 1, laneWidth: 2.75},
  living_street: { maxspeed: 20,  maxwidth: 2.5, lanes: 1, laneWidth: 2.75}
};

async function getRoads() {
  const nodes = new Nodes();
  const nodeDegree = new Map();
  
  // roads will be merged later
  let roads = [];

  const rl = readline.createInterface({
    input: fileSystem.createReadStream("sk_roads_with_signals.ndjson"),
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
          nodeDegree.set(nodeId, (nodeDegree.get(nodeId) || 0) + 1);
          return nodeId;
        });

        const highway = feature.properties?.highway;
        const maxspeed = feature.properties?.maxspeed || roadDefaultTags[highway]?.maxspeed || 70;
        const maxweight = feature.properties?.maxweight;
        const maxheight = feature.properties?.maxheight || 4;
        const maxwidth = feature.properties?.maxwidth;
        const hgv = feature.properties?.hgv || "yes";
        const oneway = feature.properties?.oneway || "no";
        const lanes = feature.properties?.lanes || roadDefaultTags[highway]?.lanes || 1;
        let lanes_forward = 0;
        let lanes_backward = 0;
        if (oneway === "yes") {
          lanes_forward = lanes
          lanes_backward = 0;
        } else if ( lanes % 2 === 0) {
          lanes_forward = lanes / 2;
          lanes_backward = lanes / 2;
        } else {
          lanes_forward = Math.ceil(lanes / 2);
          lanes_backward = Math.floor(lanes / 2);
        }

        const smoothness = feature.properties?.smoothness || "intermediate";

        roads.push({
          id: Math.random(),
          coords: coords.map((c) => [c.lat, c.lon]),
          nodes: nodeIds,
          highway,
          maxspeed,
          maxweight,
          maxheight,
          maxwidth,
          lanes,
          lanes_forward,
          lanes_backward,
          smoothness,
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
      console.error("getRoads()'s error:", e);
    }
  }

  roads = mergeRoads(roads);

  roads.forEach((road) => {
    nodes.markImportant(road.nodes.at(0));
    nodes.markImportant(road.nodes.at(-1));
    road.coords.forEach((coord, idx) => {
      if (nodeDegree.get(road.nodes[idx]) > 1) {
        nodes.markImportant(road.nodes[idx]);
      }
    });
  });

  return { roads, nodes };
}

module.exports = getRoads;
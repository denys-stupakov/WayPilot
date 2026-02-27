const Graph = require("./algorithms/Graph");
const fastHaversine = require("./algorithms/fastHaversine");
const calculateMinRadius = require("./algorithms/calculateMinRadius");

function buildGraph(roads, nodes) {
  let graph = new Graph(nodes.importantNodeIds.length);

  roads.forEach((road) => {
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
          smoothness: road.smoothness,
          maxwidth: road?.lanes_forward * 3.0 || 3.0,
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
            maxwidth: road?.lanes_backward * 3.0 || 3.0,
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

module.exports = buildGraph;
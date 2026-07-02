const test = require("node:test");
const assert = require("node:assert");
const Graph = require("../algorithms/Graph");
const { Nodes } = require("../algorithms/nodes");
const buildGraph = require("../buildGraph");

function makeRoad(overrides = {}) {
  return {
    id: 1,
    nodes: [0, 1, 2],
    coords: [
      [48.7000, 21.2000],
      [48.7001, 21.2000],
      [48.7002, 21.2000],
    ],
    highway: "primary",
    maxspeed: 90,
    maxweight: undefined,
    maxheight: 4,
    smoothness: "good",
    lanes: 2,
    lanes_forward: 1,
    lanes_backward: 1,
    hgv: "yes",
    oneway: "no",
    ...overrides,
  };
}

function makeNodes() {
  const n = new Nodes();
  n.getOrCreateNode(48.7000, 21.2000); // 0
  n.getOrCreateNode(48.7001, 21.2000); // 1
  n.getOrCreateNode(48.7002, 21.2000); // 2
  n.markImportant(0);
  n.markImportant(2); // концы важные, средний — нет
  return n;
}

test("двусторонняя дорога создаёт ребро в обе стороны между важными узлами", () => {
  const nodes = makeNodes();
  const graph = buildGraph([makeRoad()], nodes);
  assert.ok(graph.edgeMap.has("0,2"), "должно быть ребро 0→2");
  assert.ok(graph.edgeMap.has("2,0"), "должно быть обратное ребро 2→0");
});

test("oneway=yes создаёт ребро только в одну сторону", () => {
  const nodes = makeNodes();
  const graph = buildGraph([makeRoad({ oneway: "yes" })], nodes);
  assert.ok(graph.edgeMap.has("0,2"));
  assert.strictEqual(graph.edgeMap.has("2,0"), false, "обратного ребра быть не должно");
});

test("distance ребра = сумме haversine по промежуточным точкам (>0)", () => {
  const nodes = makeNodes();
  const graph = buildGraph([makeRoad()], nodes);
  const edge = graph.edgeMap.get("0,2");
  assert.ok(edge.distance > 0);
  // два отрезка ~11 м → ~22 м
  assert.ok(edge.distance > 15 && edge.distance < 30, `получено ${edge.distance}`);
});

test("теги и веса переносятся в ребро", () => {
  const nodes = makeNodes();
  const graph = buildGraph([makeRoad()], nodes);
  const edge = graph.edgeMap.get("0,2");
  assert.strictEqual(edge.tags.highway, "primary");
  assert.strictEqual(edge.weights.maxspeed, 90);
  assert.strictEqual(edge.weights.hgv, "yes");
});

const test = require("node:test");
const assert = require("node:assert");
const { Nodes, mergeRoads } = require("../algorithms/nodes");

test("getOrCreateNode дедуплицирует одинаковые координаты", () => {
  const n = new Nodes();
  const a = n.getOrCreateNode(48.7, 21.2);
  const b = n.getOrCreateNode(48.7, 21.2);
  const c = n.getOrCreateNode(48.8, 21.3);
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert.strictEqual(n.nodeCount, 2);
  assert.deepStrictEqual(n.nodeToCoord[a], [48.7, 21.2]);
});

test("markImportant идемпотентен (узел добавляется в список один раз)", () => {
  const n = new Nodes();
  const id = n.getOrCreateNode(48.7, 21.2);
  n.markImportant(id);
  n.markImportant(id);
  assert.strictEqual(n.importantNodeIds.length, 1);
  assert.strictEqual(n.nodeImportance[id], true);
});

test("светофор помечается и делает узел важным", () => {
  const n = new Nodes();
  const id = n.getOrCreateNode(48.7, 21.2);
  n.markTrafficLight(id);
  assert.strictEqual(n.hasTrafficLight(id), true);
  assert.strictEqual(n.nodeImportance[id], true);
});

test("сегменты сохраняются и читаются по паре узлов", () => {
  const n = new Nodes();
  const seg = [[48.7, 21.2], [48.71, 21.21]];
  n.addSegment(0, 1, seg);
  assert.deepStrictEqual(n.getSegment(0, 1), seg);
  assert.strictEqual(n.getSegment(1, 0), undefined);
});

test("mergeRoads склеивает две последовательные дороги с одинаковыми атрибутами", () => {
  const common = {
    oneway: "no", hgv: "yes", maxweight: undefined, maxspeed: 50,
    smoothness: "intermediate", lanes: 2, lanes_forward: 1, lanes_backward: 1,
  };
  const roads = [
    { ...common, id: 1, nodes: [0, 1], coords: [[48.70, 21.20], [48.71, 21.20]] },
    { ...common, id: 2, nodes: [1, 2], coords: [[48.71, 21.20], [48.72, 21.20]] },
  ];
  const merged = mergeRoads(roads);
  assert.strictEqual(merged.length, 1, "две цепочки должны слиться в одну");
  assert.deepStrictEqual(merged[0].nodes, [0, 1, 2]);
});

test("mergeRoads НЕ склеивает дороги с разными атрибутами", () => {
  const roads = [
    { id: 1, nodes: [0, 1], coords: [[48.70, 21.20], [48.71, 21.20]],
      oneway: "no", hgv: "yes", maxweight: undefined, maxspeed: 50, smoothness: "good", lanes: 2, lanes_forward: 1, lanes_backward: 1 },
    { id: 2, nodes: [1, 2], coords: [[48.71, 21.20], [48.72, 21.20]],
      oneway: "no", hgv: "yes", maxweight: undefined, maxspeed: 90, smoothness: "good", lanes: 2, lanes_forward: 1, lanes_backward: 1 },
  ];
  const merged = mergeRoads(roads);
  assert.strictEqual(merged.length, 2, "разные maxspeed → разные корзины, не сливаются");
});

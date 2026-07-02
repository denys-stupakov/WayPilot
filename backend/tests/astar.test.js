const test = require("node:test");
const assert = require("node:assert");
const Graph = require("../algorithms/Graph");
const { Nodes } = require("../algorithms/nodes");
const astar = require("../algorithms/astar");

// --- Хелпер: маленький граф-«ромб» 0→3 двумя путями ---
// Координаты близко друг к другу (~11 м), чтобы прямолинейная эвристика
// оставалась допустимой при заданных нами расстояниях рёбер.
function buildDiamond() {
  const nodes = new Nodes();
  nodes.getOrCreateNode(48.7000, 21.2000); // 0
  nodes.getOrCreateNode(48.7001, 21.2000); // 1 (верхний путь)
  nodes.getOrCreateNode(48.7000, 21.2001); // 2 (нижний путь)
  nodes.getOrCreateNode(48.7001, 21.2001); // 3
  [0, 1, 2, 3].forEach((id) => nodes.markImportant(id));

  const g = new Graph(4);
  const w = (o = {}) => ({ maxspeed: 50, lanes: 1, hgv: "yes", ...o });
  const addBoth = (a, b, dist, weights, tags) => {
    g.addEdge(a, b, dist, 1, weights, [], tags);
    g.addEdge(b, a, dist, 1, weights, [], tags);
    nodes.addSegment(a, b, [nodes.nodeToCoord[a], nodes.nodeToCoord[b]]);
    nodes.addSegment(b, a, [nodes.nodeToCoord[b], nodes.nodeToCoord[a]]);
  };

  // верхний путь 0-1-3: суммарно 200
  addBoth(0, 1, 100, w(), { highway: "primary" });
  addBoth(1, 3, 100, w(), { highway: "primary" });
  // нижний путь 0-2-3: суммарно 400
  addBoth(0, 2, 200, w(), { highway: "residential" });
  addBoth(2, 3, 200, w(), { highway: "residential" });

  return { g, nodes };
}

test("shortest выбирает путь с минимальной длиной (0→1→3)", () => {
  const { g, nodes } = buildDiamond();
  const r = astar(g, nodes, 0, 3, { profile: "shortest" });
  assert.deepStrictEqual(r.path, [0, 1, 3]);
  assert.strictEqual(r.distance, 200);
});

test("недостижимая цель → пустой маршрут с причиной", () => {
  const { g, nodes } = buildDiamond();
  nodes.getOrCreateNode(48.9, 21.9); // 4 — изолированный узел
  nodes.markImportant(4);
  const r = astar(g, nodes, 0, 4, { profile: "shortest" });
  assert.deepStrictEqual(r.path, []);
  assert.ok(r.reason && r.reason.length > 0);
});

test("все профили из UI валидны и возвращают маршрут", () => {
  const { g, nodes } = buildDiamond();
  for (const profile of ["shortest", "fastest", "avoidTrafficLights", "smoothness", "hgv"]) {
    const r = astar(g, nodes, 0, 3, { profile, vehicleWeight: 7.5 });
    assert.ok(Array.isArray(r.path) && r.path.length >= 2, `профиль ${profile} не дал путь`);
  }
});

test("canTraverse: перевес по maxweight отбрасывает ребро (профиль weight)", () => {
  const nodes = new Nodes();
  nodes.getOrCreateNode(48.7000, 21.2000); // 0
  nodes.getOrCreateNode(48.7001, 21.2000); // 1
  [0, 1].forEach((id) => nodes.markImportant(id));
  const g = new Graph(2);
  g.addEdge(0, 1, 100, 1, { maxweight: "3.5", hgv: "yes" }, [], { highway: "primary" });
  nodes.addSegment(0, 1, [nodes.nodeToCoord[0], nodes.nodeToCoord[1]]);

  const ok = astar(g, nodes, 0, 1, { profile: "weight", vehicleWeight: 3 });
  assert.deepStrictEqual(ok.path, [0, 1], "3 т должно проехать по мосту 3.5 т");

  const heavy = astar(g, nodes, 0, 1, { profile: "weight", vehicleWeight: 10 });
  assert.deepStrictEqual(heavy.path, [], "10 т не должно проехать по мосту 3.5 т");
});

test("hgv: hgv='no' полностью запрещает ребро", () => {
  const nodes = new Nodes();
  nodes.getOrCreateNode(48.7000, 21.2000);
  nodes.getOrCreateNode(48.7001, 21.2000);
  [0, 1].forEach((id) => nodes.markImportant(id));
  const g = new Graph(2);
  g.addEdge(0, 1, 100, 1, { hgv: "no" }, [], { highway: "primary" });
  nodes.addSegment(0, 1, [nodes.nodeToCoord[0], nodes.nodeToCoord[1]]);

  const r = astar(g, nodes, 0, 1, { profile: "hgv", vehicleWeight: 7.5 });
  assert.deepStrictEqual(r.path, [], "дорога с hgv=no недоступна грузовику");
  assert.ok(/kapacita|Trasa/.test(r.reason), "должна быть осмысленная причина");
});

test("время маршрута растёт при задержке на светофоре", () => {
  const { g, nodes } = buildDiamond();
  const base = astar(g, nodes, 0, 3, { profile: "fastest" });
  // ставим светофор на узел 1 (на кратчайшем пути) и пересчитываем
  const d2 = buildDiamond();
  d2.nodes.markTrafficLight(1);
  const withLight = astar(d2.g, d2.nodes, 0, 3, { profile: "fastest" });
  assert.ok(withLight.time >= base.time, "светофор не должен уменьшать время");
});

// --- Документирует ЛАТЕНТНЫЙ БАГ: дефолты профиля в server.js невалидны ---
test("[БАГ] дефолтные профили server.js ('normal'/'trafficLights') невалидны и бросают", () => {
  const { g, nodes } = buildDiamond();
  assert.throws(
    () => astar(g, nodes, 0, 3, { profile: "normal" }),
    /Unknown routing profile/,
    "server.js по умолчанию mode1='normal' — такого профиля нет"
  );
  assert.throws(
    () => astar(g, nodes, 0, 3, { profile: "trafficLights" }),
    /Unknown routing profile/,
    "server.js по умолчанию mode2='trafficLights' — правильный ключ 'avoidTrafficLights'"
  );
});

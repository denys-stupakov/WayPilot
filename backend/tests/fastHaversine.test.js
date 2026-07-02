const test = require("node:test");
const assert = require("node:assert");
const fastHaversine = require("../algorithms/fastHaversine");

test("расстояние от точки до самой себя = 0", () => {
  assert.strictEqual(fastHaversine(48.7, 21.2, 48.7, 21.2), 0);
});

test("1 градус широты ≈ 111 км", () => {
  const d = fastHaversine(48.0, 21.0, 49.0, 21.0);
  // ~111.2 км на градус широты
  assert.ok(Math.abs(d - 111195) < 500, `ожидалось ~111195 м, получено ${d}`);
});

test("симметричность: d(a,b) === d(b,a)", () => {
  const ab = fastHaversine(48.7, 21.2, 48.9, 21.5);
  const ba = fastHaversine(48.9, 21.5, 48.7, 21.2);
  assert.ok(Math.abs(ab - ba) < 1e-6);
});

test("результат в метрах, положительный", () => {
  const d = fastHaversine(48.716, 21.260, 48.720, 21.265);
  assert.ok(d > 0 && d < 1000);
});

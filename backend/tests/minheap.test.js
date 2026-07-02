const test = require("node:test");
const assert = require("node:assert");
const MinHeap = require("../algorithms/MinHeap");

test("dequeue возвращает элементы в порядке возрастания приоритета", () => {
  const h = new MinHeap();
  h.enqueue("c", 3);
  h.enqueue("a", 1);
  h.enqueue("b", 2);
  h.enqueue("d", 4);
  assert.deepStrictEqual(
    [h.dequeue(), h.dequeue(), h.dequeue(), h.dequeue()],
    ["a", "b", "c", "d"]
  );
});

test("пустая куча: isEmpty() и dequeue() === null", () => {
  const h = new MinHeap();
  assert.strictEqual(h.isEmpty(), true);
  assert.strictEqual(h.dequeue(), null);
});

test("updatePriority уменьшает приоритет (decrease-key) и меняет порядок", () => {
  const h = new MinHeap();
  h.enqueue("x", 10);
  h.enqueue("y", 5);
  h.updatePriority("x", 1); // теперь x должен выйти первым
  assert.strictEqual(h.dequeue(), "x");
  assert.strictEqual(h.dequeue(), "y");
});

test("updatePriority для нового элемента работает как enqueue", () => {
  const h = new MinHeap();
  h.updatePriority("z", 7);
  assert.strictEqual(h.dequeue(), "z");
});

test("updatePriority с увеличением приоритета сохраняет корректный порядок", () => {
  const h = new MinHeap();
  h.enqueue("a", 1);
  h.enqueue("b", 2);
  h.enqueue("c", 3);
  h.updatePriority("a", 5); // a уходит в конец
  assert.deepStrictEqual(
    [h.dequeue(), h.dequeue(), h.dequeue()],
    ["b", "c", "a"]
  );
});

test("стресс: 1000 случайных значений выходят отсортированными", () => {
  const h = new MinHeap();
  const vals = Array.from({ length: 1000 }, (_, i) => i);
  // перемешать
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  vals.forEach((v) => h.enqueue(`n${v}`, v));
  const out = [];
  while (!h.isEmpty()) out.push(Number(h.dequeue().slice(1)));
  const sorted = [...out].sort((a, b) => a - b);
  assert.deepStrictEqual(out, sorted);
});

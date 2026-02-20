class MinHeap {
  constructor() {
    this.heap = [];
    this.nodePosition = new Map();
  }

  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    this.nodePosition.set(this.heap[i].item, i);
    this.nodePosition.set(this.heap[j].item, j);
  }

  bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[i].priority >= this.heap[parent].priority) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  bubbleDown(i) {
    const n = this.heap.length;
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;

      if (left < n && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }

      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  enqueue(item, priority) {
    const node = { item, priority };
    this.heap.push(node);
    const index = this.heap.length - 1;
    this.nodePosition.set(item, index);
    this.bubbleUp(index);
  }

  dequeue() {
    if (this.isEmpty()) return null;

    const root = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.nodePosition.set(last.item, 0);
      this.bubbleDown(0);
    }

    this.nodePosition.delete(root.item);
    return root.item;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  updatePriority(item, newPriority) {
    if (!this.nodePosition.has(item)) {
      this.enqueue(item, newPriority);
      return;
    }

    const index = this.nodePosition.get(item);
    const oldPriority = this.heap[index].priority;
    this.heap[index].priority = newPriority;

    if (newPriority < oldPriority) {
      this.bubbleUp(index);
    } else {
      this.bubbleDown(index);
    }
  }
}

module.exports = MinHeap;

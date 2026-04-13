## kind
implement-function

## category
data-structures

## description
- Implement a parameterized B* tree of order t (minimum degree, t >= 2).
- A B* tree differs from a B-tree in two ways:
- (1) every non-root node must be at least 2/3 full (ceil(2t/3) keys minimum, max 2t-1 keys),
- (2) before splitting a full node, attempt to redistribute keys to a sibling; only split when both the node and its sibling are full, in which case two nodes become three.
- Expose the following interface:
- insert(key: number): void - insert a key.
- search(key: number): boolean - return true if key exists.
- delete(key: number): void - remove a key, rebalancing as needed.
- keys(): number[] - return all keys in sorted order (in-order traversal).
- Every non-root non-leaf node has between ceil(2t/3) and 2t-1 keys.
- The root has between 1 and 2t-1 keys.

## signature
```ts
function createBStarTree(t: number): {insert: (key: number) => void; search: (key: number) => boolean; delete: (key: number) => void; keys: () => number[]}
```

## tests
```ts
// ── order 2 ───────────────────────────────────────────────
{
	const tree = createBStarTree(2);

	// empty tree
	assert.strictEqual(tree.search(1), false);
	assert.deepStrictEqual(tree.keys(), []);

	// insert and search
	for (const k of [10, 20, 5, 6, 12, 30, 7, 17]) tree.insert(k);
	assert.deepStrictEqual(tree.keys(), [5, 6, 7, 10, 12, 17, 20, 30]);
	assert.strictEqual(tree.search(6),  true);
	assert.strictEqual(tree.search(17), true);
	assert.strictEqual(tree.search(99), false);

	// delete leaf key
	tree.delete(6);
	assert.strictEqual(tree.search(6), false);
	assert.deepStrictEqual(tree.keys(), [5, 7, 10, 12, 17, 20, 30]);

	// delete internal key
	tree.delete(10);
	assert.strictEqual(tree.search(10), false);
	assert.deepStrictEqual(tree.keys(), [5, 7, 12, 17, 20, 30]);

	// delete non-existent key — must not throw or corrupt
	tree.delete(99);
	assert.deepStrictEqual(tree.keys(), [5, 7, 12, 17, 20, 30]);

	// insert after delete
	tree.insert(11);
	assert.deepStrictEqual(tree.keys(), [5, 7, 11, 12, 17, 20, 30]);
}

// ── order 3 (higher fanout, exercises 2/3-fill invariant more) ──
{
	const tree = createBStarTree(3);
	const input = [15, 10, 20, 5, 12, 17, 25, 3, 7, 11, 13, 16, 18, 22, 30];
	for (const k of input) tree.insert(k);

	// sorted order preserved
	assert.deepStrictEqual(tree.keys(), [...input].sort((a, b) => a - b));

	// all keys searchable
	for (const k of input) assert.strictEqual(tree.search(k), true);

	// delete half the keys, remainder still sorted and searchable
	const toDelete = [5, 15, 25, 11, 18];
	for (const k of toDelete) tree.delete(k);
	const remaining = input.filter(k => !toDelete.includes(k)).sort((a, b) => a - b);
	assert.deepStrictEqual(tree.keys(), remaining);
	for (const k of remaining) assert.strictEqual(tree.search(k), true);
	for (const k of toDelete)  assert.strictEqual(tree.search(k), false);
}

// ── duplicate keys ───────────────────────────────────────
{
	const tree = createBStarTree(2);
	tree.insert(5);
	tree.insert(5);
	// duplicates silently ignored or stored — keys() must be sorted regardless
	const ks = tree.keys();
	assert.ok(ks.every((v, i) => i === 0 || ks[i - 1]! <= v));
}

// ── sequential insert (worst case for naive splits) ──────
{
	const tree = createBStarTree(2);
	for (let i = 1; i <= 50; i++) tree.insert(i);
	assert.deepStrictEqual(
		tree.keys(),
		Array.from({length: 50}, (_, i) => i + 1),
	);
	for (let i = 1; i <= 50; i += 2) tree.delete(i);
	assert.deepStrictEqual(
		tree.keys(),
		Array.from({length: 25}, (_, i) => (i + 1) * 2),
	);
}
```

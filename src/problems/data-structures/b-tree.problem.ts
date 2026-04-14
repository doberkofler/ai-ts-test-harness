import {defineImplementProblem} from '#problem-api';

type TreeApi = {
	insert: (key: number) => void;
	search: (key: number) => boolean;
	delete: (key: number) => void;
	keys: () => number[];
};

type BTreeNode = {
	leaf: boolean;
	keys: number[];
	children: BTreeNode[];
};

export default defineImplementProblem({
	name: 'b-tree',
	description: [
		'Implement a parameterized B-tree of minimum degree t (t >= 2).',
		'Expose insert, search, delete, and keys APIs.',
		'Use standard B-tree split-on-descent insertion; duplicate inserts should be ignored.',
	],
	signature:
		'function createBTree(t: number): {insert: (key: number) => void; search: (key: number) => boolean; delete: (key: number) => void; keys: () => number[]}',
	solution: function createBTree(t: number): TreeApi {
		if (!Number.isInteger(t) || t < 2) {
			throw new RangeError(`t must be an integer >= 2, got ${t}`);
		}

		const at = <T>(items: readonly T[], index: number, label: string): T => {
			const value = items[index];
			if (value === undefined) {
				throw new Error(`invalid B-tree state: missing ${label} at index ${index}`);
			}

			return value;
		};

		const createNode = (leaf: boolean): BTreeNode => ({leaf, keys: [], children: []});

		const searchNode = (node: BTreeNode, key: number): boolean => {
			let i = 0;
			while (i < node.keys.length && key > at(node.keys, i, 'key')) {
				i++;
			}

			if (i < node.keys.length && key === at(node.keys, i, 'key')) {
				return true;
			}

			if (node.leaf) {
				return false;
			}

			return searchNode(at(node.children, i, 'child'), key);
		};

		const splitChild = (parent: BTreeNode, childIndex: number, degree: number): void => {
			const child = at(parent.children, childIndex, 'child');
			const right = createNode(child.leaf);
			const middleIndex = degree - 1;
			const middleKey = at(child.keys, middleIndex, 'middle key');

			right.keys = child.keys.slice(middleIndex + 1);
			child.keys = child.keys.slice(0, middleIndex);

			if (!child.leaf) {
				right.children = child.children.slice(degree);
				child.children = child.children.slice(0, degree);
			}

			parent.children.splice(childIndex + 1, 0, right);
			parent.keys.splice(childIndex, 0, middleKey);
		};

		const insertIntoLeaf = (node: BTreeNode, key: number): void => {
			let i = node.keys.length - 1;
			while (i >= 0 && key < at(node.keys, i, 'key')) {
				i--;
			}
			node.keys.splice(i + 1, 0, key);
		};

		const inOrder = (node: BTreeNode, output: number[]): void => {
			if (node.leaf) {
				output.push(...node.keys);
				return;
			}

			for (let i = 0; i < node.keys.length; i++) {
				inOrder(at(node.children, i, 'child'), output);
				output.push(at(node.keys, i, 'key'));
			}
			inOrder(at(node.children, node.keys.length, 'right child'), output);
		};

		const maxKeys = 2 * t - 1;
		let root: BTreeNode = createNode(true);

		const insertNonFull = (node: BTreeNode, key: number): void => {
			if (node.leaf) {
				insertIntoLeaf(node, key);
				return;
			}

			let childIndex = 0;
			while (childIndex < node.keys.length && key > at(node.keys, childIndex, 'key')) {
				childIndex++;
			}

			const child = at(node.children, childIndex, 'child');
			if (child.keys.length >= maxKeys) {
				splitChild(node, childIndex, t);
				if (key > at(node.keys, childIndex, 'key')) {
					childIndex++;
				}
			}

			insertNonFull(at(node.children, childIndex, 'child'), key);
		};

		const insertKey = (key: number): void => {
			if (searchNode(root, key)) {
				return;
			}

			if (root.keys.length >= maxKeys) {
				const newRoot = createNode(false);
				newRoot.children.push(root);
				splitChild(newRoot, 0, t);
				root = newRoot;
			}

			insertNonFull(root, key);
		};

		const getKeys = (): number[] => {
			const output: number[] = [];
			inOrder(root, output);
			return output;
		};

		const deleteKey = (key: number): void => {
			if (!searchNode(root, key)) {
				return;
			}

			const remaining = getKeys().filter((value) => value !== key);
			root = createNode(true);
			for (const value of remaining) {
				insertKey(value);
			}
		};

		return {
			insert: (key: number) => {
				insertKey(key);
			},
			search: (key: number) => searchNode(root, key),
			delete: (key: number) => {
				deleteKey(key);
			},
			keys: () => getKeys(),
		};
	},
	tests: ({assert, implementation}) => {
		const isTreeApi = (value: unknown): value is TreeApi => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}

			return (
				typeof Reflect.get(value, 'insert') === 'function' &&
				typeof Reflect.get(value, 'search') === 'function' &&
				typeof Reflect.get(value, 'delete') === 'function' &&
				typeof Reflect.get(value, 'keys') === 'function'
			);
		};

		const createTree = (degree: number): TreeApi => {
			const tree = implementation(degree);
			if (!isTreeApi(tree)) {
				throw new TypeError('expected createBTree to return tree API');
			}

			return tree;
		};

		{
			const tree = createTree(2);
			assert.strictEqual(tree.search(1), false);
			assert.deepStrictEqual(tree.keys(), []);

			for (const key of [10, 20, 5, 6, 12, 30, 7, 17]) {
				tree.insert(key);
			}

			assert.deepStrictEqual(tree.keys(), [5, 6, 7, 10, 12, 17, 20, 30]);
			assert.strictEqual(tree.search(12), true);
			assert.strictEqual(tree.search(999), false);
		}

		{
			const tree = createTree(3);
			const input = [15, 10, 20, 5, 12, 17, 25, 3, 7, 11, 13, 16, 18, 22, 30];
			for (const key of input) {
				tree.insert(key);
			}

			assert.deepStrictEqual(
				tree.keys(),
				[...input].sort((a, b) => a - b),
			);
		}

		{
			const tree = createTree(2);
			for (let i = 1; i <= 30; i++) {
				tree.insert(i);
			}

			tree.insert(10);
			tree.insert(20);
			assert.deepStrictEqual(
				tree.keys(),
				Array.from({length: 30}, (_value, i) => i + 1),
			);

			tree.delete(1);
			tree.delete(15);
			tree.delete(30);
			tree.delete(999);
			assert.deepStrictEqual(
				tree.keys(),
				Array.from({length: 30}, (_value, i) => i + 1).filter((value) => value !== 1 && value !== 15 && value !== 30),
			);
			assert.strictEqual(tree.search(1), false);
			assert.strictEqual(tree.search(15), false);
			assert.strictEqual(tree.search(30), false);
		}
	},
});

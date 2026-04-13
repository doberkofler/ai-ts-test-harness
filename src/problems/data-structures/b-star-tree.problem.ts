import {defineImplementProblem} from '#problem-api';

type TreeApi = {
	insert: (key: number) => void;
	search: (key: number) => boolean;
	delete: (key: number) => void;
	keys: () => number[];
};

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

export default defineImplementProblem({
	name: 'b-star-tree',
	category: 'data-structures',
	description: [
		'Implement a parameterized B* tree of order t (minimum degree, t >= 2).',
		'Before splitting a full node, attempt to redistribute keys to a sibling.',
		'Expose insert, search, delete, and keys APIs.',
	],
	signature:
		'function createBStarTree(t: number): {insert: (key: number) => void; search: (key: number) => boolean; delete: (key: number) => void; keys: () => number[]}',
	tests: ({assert, implementation}) => {
		const createTree = (degree: number): TreeApi => {
			const tree = implementation(degree);
			if (!isTreeApi(tree)) {
				throw new TypeError('expected createBStarTree to return tree API');
			}

			return tree;
		};

		{
			const tree = createTree(2);
			assert.strictEqual(tree.search(1), false);
			assert.deepStrictEqual(tree.keys(), []);
			for (const k of [10, 20, 5, 6, 12, 30, 7, 17]) {
				tree.insert(k);
			}
			assert.deepStrictEqual(tree.keys(), [5, 6, 7, 10, 12, 17, 20, 30]);
			tree.delete(6);
			assert.deepStrictEqual(tree.keys(), [5, 7, 10, 12, 17, 20, 30]);
			tree.delete(10);
			assert.deepStrictEqual(tree.keys(), [5, 7, 12, 17, 20, 30]);
		}

		{
			const tree = createTree(3);
			const input = [15, 10, 20, 5, 12, 17, 25, 3, 7, 11, 13, 16, 18, 22, 30];
			for (const k of input) {
				tree.insert(k);
			}
			assert.deepStrictEqual(
				tree.keys(),
				[...input].sort((a, b) => a - b),
			);
		}

		{
			const tree = createTree(2);
			for (let i = 1; i <= 50; i++) {
				tree.insert(i);
			}
			assert.deepStrictEqual(
				tree.keys(),
				Array.from({length: 50}, (_value, i) => i + 1),
			);
		}
	},
});

import {defineImplementProblem} from '#problem-api';

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
	tests: [
		'{',
		'\tconst tree = createBStarTree(2);',
		'\tassert.strictEqual(tree.search(1), false);',
		'\tassert.deepStrictEqual(tree.keys(), []);',
		'\tfor (const k of [10, 20, 5, 6, 12, 30, 7, 17]) tree.insert(k);',
		'\tassert.deepStrictEqual(tree.keys(), [5, 6, 7, 10, 12, 17, 20, 30]);',
		'\ttree.delete(6);',
		'\tassert.deepStrictEqual(tree.keys(), [5, 7, 10, 12, 17, 20, 30]);',
		'\ttree.delete(10);',
		'\tassert.deepStrictEqual(tree.keys(), [5, 7, 12, 17, 20, 30]);',
		'}',
		'{',
		'\tconst tree = createBStarTree(3);',
		'\tconst input = [15, 10, 20, 5, 12, 17, 25, 3, 7, 11, 13, 16, 18, 22, 30];',
		'\tfor (const k of input) tree.insert(k);',
		'\tassert.deepStrictEqual(tree.keys(), [...input].sort((a, b) => a - b));',
		'}',
		'{',
		'\tconst tree = createBStarTree(2);',
		'\tfor (let i = 1; i <= 50; i++) tree.insert(i);',
		'\tassert.deepStrictEqual(tree.keys(), Array.from({length: 50}, (_, i) => i + 1));',
		'}',
	].join('\n'),
});

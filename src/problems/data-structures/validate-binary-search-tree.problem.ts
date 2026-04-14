import {defineImplementProblem} from '#problem-api';

type TreeNode = {
	value: number;
	left: TreeNode | null;
	right: TreeNode | null;
};

export default defineImplementProblem({
	name: 'validate-binary-search-tree',
	description: 'Return true when a binary tree is a valid BST (strictly ordered: left < node < right).',
	signature: 'function validateBinarySearchTree(root: {value: number; left: any; right: any} | null): boolean',
	solution: function validateBinarySearchTree(root: TreeNode | null): boolean {
		const walk = (node: TreeNode | null, min: number | null, max: number | null): boolean => {
			if (node === null) {
				return true;
			}

			if ((min !== null && node.value <= min) || (max !== null && node.value >= max)) {
				return false;
			}

			return walk(node.left, min, node.value) && walk(node.right, node.value, max);
		};

		return walk(root, null, null);
	},
	tests: ({assert, implementation}) => {
		const n = (value: number, left: TreeNode | null = null, right: TreeNode | null = null): TreeNode => ({value, left, right});

		assert.strictEqual(implementation(null), true);
		assert.strictEqual(implementation(n(2, n(1), n(3))), true);
		assert.strictEqual(implementation(n(5, n(1), n(4, n(3), n(6)))), false);
		assert.strictEqual(implementation(n(2, n(2), n(3))), false);
		assert.strictEqual(implementation(n(10, n(5, n(2), n(12)), n(15))), false);
	},
});

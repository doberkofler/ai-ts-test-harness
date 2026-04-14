import {defineImplementProblem} from '#problem-api';

type AvlNode = {
	value: number;
	height: number;
	left: AvlNode | null;
	right: AvlNode | null;
};

export default defineImplementProblem({
	name: 'avl-tree-insert-rebalance',
	description: [
		'Build an AVL tree by inserting values in order and rebalancing after each insert.',
		'Duplicate values should be ignored. Return the root node.',
	],
	signature: 'function avlTreeInsertRebalance(values: number[]): {value: number; height: number; left: any; right: any} | null',
	solution: function avlTreeInsertRebalance(values: number[]): AvlNode | null {
		const height = (node: AvlNode | null): number => (node === null ? 0 : node.height);

		const updateHeight = (node: AvlNode): void => {
			node.height = Math.max(height(node.left), height(node.right)) + 1;
		};

		const balanceFactor = (node: AvlNode): number => height(node.left) - height(node.right);

		const rotateRight = (root: AvlNode): AvlNode => {
			const pivot = root.left;
			if (pivot === null) {
				return root;
			}

			root.left = pivot.right;
			pivot.right = root;
			updateHeight(root);
			updateHeight(pivot);
			return pivot;
		};

		const rotateLeft = (root: AvlNode): AvlNode => {
			const pivot = root.right;
			if (pivot === null) {
				return root;
			}

			root.right = pivot.left;
			pivot.left = root;
			updateHeight(root);
			updateHeight(pivot);
			return pivot;
		};

		const rebalance = (node: AvlNode): AvlNode => {
			updateHeight(node);
			const balance = balanceFactor(node);

			if (balance > 1) {
				if (node.left !== null && balanceFactor(node.left) < 0) {
					node.left = rotateLeft(node.left);
				}
				return rotateRight(node);
			}

			if (balance < -1) {
				if (node.right !== null && balanceFactor(node.right) > 0) {
					node.right = rotateRight(node.right);
				}
				return rotateLeft(node);
			}

			return node;
		};

		const insert = (node: AvlNode | null, value: number): AvlNode => {
			if (node === null) {
				return {value, height: 1, left: null, right: null};
			}

			if (value === node.value) {
				return node;
			}

			if (value < node.value) {
				node.left = insert(node.left, value);
			} else {
				node.right = insert(node.right, value);
			}

			return rebalance(node);
		};

		let root: AvlNode | null = null;
		for (const value of values) {
			root = insert(root, value);
		}

		return root;
	},
	tests: ({assert, implementation}) => {
		const isAvlNode = (value: unknown): value is AvlNode => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}
			if (!('value' in value) || !('height' in value) || !('left' in value) || !('right' in value)) {
				return false;
			}

			const {
				value: nodeValue,
				height: nodeHeight,
				left,
				right,
			} = value as {
				value: unknown;
				height: unknown;
				left: unknown;
				right: unknown;
			};
			return (
				typeof nodeValue === 'number' &&
				typeof nodeHeight === 'number' &&
				(left === null || typeof left === 'object') &&
				(right === null || typeof right === 'object')
			);
		};

		const build = (values: number[]): AvlNode | null => {
			const result = implementation(values);
			if (result === null) {
				return null;
			}
			if (!isAvlNode(result)) {
				throw new TypeError('avlTreeInsertRebalance must return an AVL node or null');
			}
			return result;
		};

		const inOrder = (node: AvlNode | null, output: number[]): void => {
			if (node === null) {
				return;
			}

			inOrder(node.left, output);
			output.push(node.value);
			inOrder(node.right, output);
		};

		const verify = (node: AvlNode | null): number => {
			if (node === null) {
				return 0;
			}

			const leftHeight = verify(node.left);
			const rightHeight = verify(node.right);
			assert.ok(Math.abs(leftHeight - rightHeight) <= 1, 'AVL balance factor must be within [-1, 1]');
			assert.strictEqual(node.height, Math.max(leftHeight, rightHeight) + 1, 'height field must be correct');
			return node.height;
		};

		assert.strictEqual(build([]), null);

		{
			const root = build([10, 20, 30, 40, 50, 25]);
			const output: number[] = [];
			inOrder(root, output);
			assert.deepStrictEqual(output, [10, 20, 25, 30, 40, 50]);
			verify(root);
		}

		{
			const root = build([7, 3, 9, 1, 5, 8, 10, 3, 9, 5]);
			const output: number[] = [];
			inOrder(root, output);
			assert.deepStrictEqual(output, [1, 3, 5, 7, 8, 9, 10]);
			verify(root);
		}
	},
});

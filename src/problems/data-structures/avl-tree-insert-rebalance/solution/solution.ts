type AvlNode = {
	value: number;
	height: number;
	left: AvlNode | null;
	right: AvlNode | null;
};

const __legacySolution = (function avlTreeInsertRebalance(values: number[]): AvlNode | null {
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
	});
export const avlTreeInsertRebalance = __legacySolution;

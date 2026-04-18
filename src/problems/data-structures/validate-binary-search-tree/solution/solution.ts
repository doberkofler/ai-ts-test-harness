type TreeNode = {
	value: number;
	left: TreeNode | null;
	right: TreeNode | null;
};

const __legacySolution = (function validateBinarySearchTree(root: TreeNode | null): boolean {
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
	});
export const validateBinarySearchTree = __legacySolution;

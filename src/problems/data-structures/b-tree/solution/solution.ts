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

const __legacySolution = (function createBTree(t: number): TreeApi {
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
	});
export const createBTree = __legacySolution;

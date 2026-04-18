type TreeApi = {
	insert: (key: number) => void;
	search: (key: number) => boolean;
	delete: (key: number) => void;
	keys: () => number[];
};

type BStarNode = {
	leaf: boolean;
	keys: number[];
	children: BStarNode[];
};

const __legacySolution = (function createBStarTree(t: number): TreeApi {
		if (!Number.isInteger(t) || t < 2) {
			throw new RangeError(`t must be an integer >= 2, got ${t}`);
		}

		const at = <T>(items: readonly T[], index: number, label: string): T => {
			const value = items[index];
			if (value === undefined) {
				throw new Error(`invalid B* tree state: missing ${label} at index ${index}`);
			}

			return value;
		};

		const shift = <T>(items: T[], label: string): T => {
			const value = items.shift();
			if (value === undefined) {
				throw new Error(`invalid B* tree state: missing shifted ${label}`);
			}

			return value;
		};

		const pop = <T>(items: T[], label: string): T => {
			const value = items.pop();
			if (value === undefined) {
				throw new Error(`invalid B* tree state: missing popped ${label}`);
			}

			return value;
		};

		const createNode = (leaf: boolean): BStarNode => ({leaf, keys: [], children: []});

		const searchNode = (node: BStarNode, key: number): boolean => {
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

		const splitChild = (parent: BStarNode, childIndex: number, degree: number): void => {
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

		const insertIntoLeaf = (node: BStarNode, key: number): void => {
			let i = node.keys.length - 1;
			while (i >= 0 && key < at(node.keys, i, 'key')) {
				i--;
			}
			node.keys.splice(i + 1, 0, key);
		};

		const inOrder = (node: BStarNode, output: number[]): void => {
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
		let root: BStarNode = {leaf: true, keys: [], children: []};

		const redistributeToLeft = (parent: BStarNode, childIndex: number): boolean => {
			if (childIndex === 0) {
				return false;
			}

			const child = at(parent.children, childIndex, 'child');
			const left = at(parent.children, childIndex - 1, 'left sibling');
			if (left.keys.length >= maxKeys) {
				return false;
			}

			left.keys.push(at(parent.keys, childIndex - 1, 'separator key'));
			parent.keys[childIndex - 1] = shift(child.keys, 'key');

			if (!child.leaf) {
				left.children.push(shift(child.children, 'child'));
			}

			return true;
		};

		const redistributeToRight = (parent: BStarNode, childIndex: number): boolean => {
			if (childIndex >= parent.children.length - 1) {
				return false;
			}

			const child = at(parent.children, childIndex, 'child');
			const right = at(parent.children, childIndex + 1, 'right sibling');
			if (right.keys.length >= maxKeys) {
				return false;
			}

			right.keys.unshift(at(parent.keys, childIndex, 'separator key'));
			parent.keys[childIndex] = pop(child.keys, 'key');

			if (!child.leaf) {
				right.children.unshift(pop(child.children, 'child'));
			}

			return true;
		};

		const ensureChildHasSpace = (parent: BStarNode, childIndex: number): void => {
			const child = at(parent.children, childIndex, 'child');
			if (child.keys.length < maxKeys) {
				return;
			}

			if (redistributeToLeft(parent, childIndex) || redistributeToRight(parent, childIndex)) {
				return;
			}

			splitChild(parent, childIndex, t);
		};

		const insertNonFull = (node: BStarNode, key: number): void => {
			if (node.leaf) {
				insertIntoLeaf(node, key);
				return;
			}

			let childIndex = 0;
			while (childIndex < node.keys.length && key > at(node.keys, childIndex, 'key')) {
				childIndex++;
			}

			ensureChildHasSpace(node, childIndex);

			childIndex = 0;
			while (childIndex < node.keys.length && key > at(node.keys, childIndex, 'key')) {
				childIndex++;
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

		const rebuildWithout = (key: number): void => {
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
				if (!searchNode(root, key)) {
					return;
				}
				rebuildWithout(key);
			},
			keys: () => getKeys(),
		};
	});
export const createBStarTree = __legacySolution;

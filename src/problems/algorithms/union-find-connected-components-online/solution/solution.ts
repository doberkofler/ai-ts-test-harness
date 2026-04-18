type UnionOp = readonly [left: number, right: number];

const __legacySolution = (function unionFindConnectedComponentsOnline(n: number, operations: readonly UnionOp[]): number[] {
		const parent = Array.from({length: n}, (_value, index) => index);
		const size = Array.from({length: n}, () => 1);
		let components = n;

		const parentAt = (index: number): number => {
			const value = parent[index];
			if (typeof value !== 'number') {
				throw new TypeError(`missing parent for ${index}`);
			}
			return value;
		};

		const sizeAt = (index: number): number => {
			const value = size[index];
			if (typeof value !== 'number') {
				throw new TypeError(`missing size for ${index}`);
			}
			return value;
		};

		const find = (value: number): number => {
			let node = value;
			while (node !== parentAt(node)) {
				parent[node] = parentAt(parentAt(node));
				node = parentAt(node);
			}
			return node;
		};

		const unify = (left: number, right: number): void => {
			if (left < 0 || left >= n || right < 0 || right >= n) {
				return;
			}

			let rootLeft = find(left);
			let rootRight = find(right);
			if (rootLeft === rootRight) {
				return;
			}

			if (sizeAt(rootLeft) < sizeAt(rootRight)) {
				const tmp = rootLeft;
				rootLeft = rootRight;
				rootRight = tmp;
			}

			parent[rootRight] = rootLeft;
			size[rootLeft] = sizeAt(rootLeft) + sizeAt(rootRight);
			components -= 1;
		};

		const output: number[] = [];
		for (const [left, right] of operations) {
			unify(left, right);
			output.push(components);
		}

		return output;
	});
export const unionFindConnectedComponentsOnline = __legacySolution;

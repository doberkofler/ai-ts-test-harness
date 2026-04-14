import {defineImplementProblem} from '#problem-api';

type UnionOp = readonly [left: number, right: number];

export default defineImplementProblem({
	name: 'union-find-connected-components-online',
	description: [
		'Starting with n isolated nodes [0..n-1], apply union operations online.',
		'Return the number of connected components after each union operation.',
	],
	signature: 'function unionFindConnectedComponentsOnline(n: number, operations: readonly (readonly [number, number])[]): number[]',
	solution: function unionFindConnectedComponentsOnline(n: number, operations: readonly UnionOp[]): number[] {
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
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(
			implementation(5, [
				[0, 1],
				[1, 2],
				[3, 4],
				[2, 4],
			]),
			[4, 3, 2, 1],
		);
		assert.deepStrictEqual(
			implementation(3, [
				[0, 0],
				[0, 1],
				[1, 2],
				[2, 2],
			]),
			[3, 2, 1, 1],
		);
	},
});

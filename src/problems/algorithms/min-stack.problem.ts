import {defineImplementProblem} from '#problem-api';

type Operation = readonly [op: 'push' | 'pop' | 'top' | 'getMin', value?: number];

export default defineImplementProblem({
	name: 'min-stack',
	category: 'algorithms',
	description: 'Implement a stack that can return the minimum value in constant time while processing operation tuples.',
	signature: "function minStack(operations: readonly (readonly ['push' | 'pop' | 'top' | 'getMin', number?])[]): (number | null)[]",
	solution: function minStack(operations: readonly Operation[]): (number | null)[] {
		const values: number[] = [];
		const mins: number[] = [];
		const output: (number | null)[] = [];

		for (const [op, maybeValue] of operations) {
			if (op === 'push') {
				if (typeof maybeValue !== 'number') {
					throw new TypeError('push operation requires a numeric value');
				}

				values.push(maybeValue);
				const lastMin = mins.at(-1);
				const currentMin = typeof lastMin === 'number' ? Math.min(lastMin, maybeValue) : maybeValue;
				mins.push(currentMin);
				output.push(null);
				continue;
			}

			if (op === 'pop') {
				if (values.length === 0) {
					output.push(null);
					continue;
				}

				mins.pop();
				const popped = values.pop() ?? null;
				output.push(popped);
				continue;
			}

			if (op === 'top') {
				output.push(values.length === 0 ? null : (values.at(-1) ?? null));
				continue;
			}

			output.push(mins.length === 0 ? null : (mins.at(-1) ?? null));
		}

		return output;
	},
	tests: ({assert, implementation}) => {
		const result = implementation([['push', -2], ['push', 0], ['push', -3], ['getMin'], ['pop'], ['top'], ['getMin']]);

		assert.deepStrictEqual(result, [null, null, null, -3, -3, 0, -2]);
		assert.deepStrictEqual(implementation([['pop'], ['getMin'], ['top']]), [null, null, null]);
	},
});

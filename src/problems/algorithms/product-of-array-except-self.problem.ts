import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'product-of-array-except-self',
	category: 'algorithms',
	description: 'Return an array where each element is the product of all values except itself, without division.',
	signature: 'function productOfArrayExceptSelf(values: number[]): number[]',
	solution: function productOfArrayExceptSelf(values: number[]): number[] {
		const result = Array.from({length: values.length}, () => 1);
		let prefix = 1;
		for (let index = 0; index < values.length; index += 1) {
			result[index] = prefix;
			prefix *= values.at(index) ?? 1;
		}

		let suffix = 1;
		for (let index = values.length - 1; index >= 0; index -= 1) {
			const currentResult = result.at(index);
			if (typeof currentResult === 'number') {
				result[index] = currentResult * suffix;
			}

			suffix *= values.at(index) ?? 1;
		}

		return result.map((value) => (Object.is(value, -0) ? 0 : value));
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation([1, 2, 3, 4]), [24, 12, 8, 6]);
		assert.deepStrictEqual(implementation([0, 1, 2, 3]), [6, 0, 0, 0]);
		assert.deepStrictEqual(implementation([-1, 1, 0, -3, 3]), [0, 0, 9, 0, 0]);
	},
});

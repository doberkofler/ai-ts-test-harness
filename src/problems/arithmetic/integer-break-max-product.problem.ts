import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'integer-break-max-product',
	description: ['Split n into at least two positive integers so their product is maximized.', 'Return that maximum product.'],
	signature: 'function integerBreakMaxProduct(n: number): number',
	solution: function integerBreakMaxProduct(n: number): number {
		if (!Number.isInteger(n) || n < 2) {
			throw new RangeError('n must be an integer >= 2');
		}

		const best = Array.from({length: n + 1}, () => 0);
		best[1] = 1;

		for (let sum = 2; sum <= n; sum += 1) {
			let maxProduct = 0;
			for (let part = 1; part < sum; part += 1) {
				const remaining = sum - part;
				const left = Math.max(part, best[part] ?? 0);
				const right = Math.max(remaining, best[remaining] ?? 0);
				maxProduct = Math.max(maxProduct, left * right);
			}
			best[sum] = maxProduct;
		}

		return best[n] ?? 0;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation(2), 1);
		assert.strictEqual(implementation(3), 2);
		assert.strictEqual(implementation(4), 4);
		assert.strictEqual(implementation(5), 6);
		assert.strictEqual(implementation(8), 18);
		assert.strictEqual(implementation(10), 36);
	},
});

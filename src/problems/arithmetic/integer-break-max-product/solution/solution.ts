const __legacySolution = (function integerBreakMaxProduct(n: number): number {
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
	});
export const integerBreakMaxProduct = __legacySolution;

const __legacySolution = (function fibonacci(n: number): number {
		if (!Number.isInteger(n) || n < 0) {
			throw new RangeError(`n must be a non-negative integer, got ${n}`);
		}

		if (n < 2) {
			return n;
		}

		return fibonacci(n - 1) + fibonacci(n - 2);
	});
export const fibonacci = __legacySolution;

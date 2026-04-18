const memo = new Map<number, number>([[0, 0], [1, 1]]);

export function fibonacci(n: number): number {
	const cached = memo.get(n);
	if (typeof cached === 'number') {
		return cached;
	}
	const value = fibonacci(n - 1) + fibonacci(n - 2);
	memo.set(n, value);
	return value;
}

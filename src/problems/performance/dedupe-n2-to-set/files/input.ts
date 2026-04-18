export function dedupe(values: number[]): number[] {
	const result: number[] = [];
	for (const value of values) {
		if (!result.includes(value)) {
			result.push(value);
		}
	}
	return result;
}

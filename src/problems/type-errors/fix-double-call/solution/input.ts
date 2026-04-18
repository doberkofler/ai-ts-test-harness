function double(n: number): number {
	return n * 2;
}

export function run(input: string): number {
	return double(Number(input));
}

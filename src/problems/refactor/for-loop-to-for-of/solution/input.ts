function sumAll(numbers: number[]): number {
	let total = 0;
	for (const number of numbers) {
		total += number;
	}
	return total;
}

export {sumAll};

function computeDiscount(a: number, b: number): number {
	const tmp = a * (b / 100);
	const res = a - tmp;
	return res;
}

export {computeDiscount};

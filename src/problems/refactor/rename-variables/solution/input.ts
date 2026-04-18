function computeDiscount(amount: number, discountPercent: number): number {
	const discountAmount = amount * (discountPercent / 100);
	const discountedTotal = amount - discountAmount;
	return discountedTotal;
}

export {computeDiscount};

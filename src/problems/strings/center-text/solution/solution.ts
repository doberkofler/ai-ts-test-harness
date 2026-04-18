const __legacySolution = (function centerText(text: string, width: number): string {
		if (text.length >= width) {
			return text;
		}

		const totalPadding = width - text.length;
		const leftPadding = Math.floor(totalPadding / 2);
		const rightPadding = totalPadding - leftPadding;
		return `${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}`;
	});
export const centerText = __legacySolution;

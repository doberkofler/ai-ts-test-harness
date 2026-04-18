const __legacySolution = (function longestCommonSubsequence(a: string, b: string): number {
		let previous = Array.from({length: b.length + 1}, () => 0);

		for (let i = 1; i <= a.length; i++) {
			const current = Array.from({length: b.length + 1}, () => 0);
			for (let j = 1; j <= b.length; j++) {
				const diagonal = previous[j - 1] ?? 0;
				const up = previous[j] ?? 0;
				const left = current[j - 1] ?? 0;
				current[j] = a[i - 1] === b[j - 1] ? diagonal + 1 : Math.max(up, left);
			}
			previous = current;
		}

		return previous[b.length] ?? 0;
	});
export const longestCommonSubsequence = __legacySolution;

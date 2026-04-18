const __legacySolution = (function wholeWordCafeUnicode(): RegExp {
		return /(?<!\p{L})café(?!\p{L})/u;
	});
export const wholeWordCafeUnicode = __legacySolution;

const __legacySolution = (function nonCurrencyFloatLookbehind(): RegExp {
		return /(?<![$€])\b\d+\.\d+\b/;
	});
export const nonCurrencyFloatLookbehind = __legacySolution;

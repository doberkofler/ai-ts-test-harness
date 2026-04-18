const __legacySolution = (function creditCardRedactionMatch(): RegExp {
		return /(?<!\d)(?:\d{4}(?:[ -]\d{4}){2,3}(?!\d)|[A-Za-z]+:\s\d{13,19}(?!\d))/g;
	});
export const creditCardRedactionMatch = __legacySolution;

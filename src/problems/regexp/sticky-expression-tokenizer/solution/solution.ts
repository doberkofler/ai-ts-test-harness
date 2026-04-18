const __legacySolution = (function stickyExpressionTokenizer(): RegExp {
		return /\s+|\d+|[+\-*/]|[a-z]+/y;
	});
export const stickyExpressionTokenizer = __legacySolution;

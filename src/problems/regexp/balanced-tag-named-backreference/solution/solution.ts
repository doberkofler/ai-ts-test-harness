const __legacySolution = (function balancedTagNamedBackreference(): RegExp {
		return /^<(?<name>[a-z][\w-]*)>.*<\/\k<name>>$/is;
	});
export const balancedTagNamedBackreference = __legacySolution;

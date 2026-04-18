const __legacySolution = (function innermostTagContentNonGreedy(): RegExp {
		return /^<[a-z][\w-]*><[a-z][\w-]*>(.*?)<\/[a-z][\w-]*><\/[a-z][\w-]*>$/i;
	});
export const innermostTagContentNonGreedy = __legacySolution;

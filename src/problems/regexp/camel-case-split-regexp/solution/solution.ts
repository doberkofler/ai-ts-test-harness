const __legacySolution = (function camelCaseSplitRegexp(): RegExp {
		return /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;
	});
export const camelCaseSplitRegexp = __legacySolution;

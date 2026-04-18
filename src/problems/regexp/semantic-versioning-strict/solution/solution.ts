const __legacySolution = (function semanticVersioningStrict(): RegExp {
		return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[a-z-][0-9a-z-]*)(?:\.(?:0|[1-9]\d*|[a-z-][0-9a-z-]*))*)?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i;
	});
export const semanticVersioningStrict = __legacySolution;

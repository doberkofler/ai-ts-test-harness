const __legacySolution = (function toNumber(s: string): number | null {
		const trimmed = s.trim();
		if (trimmed.length === 0) {
			return null;
		}

		if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
			return null;
		}

		const parsed = Number(trimmed);
		if (parsed === 0) {
			return 0;
		}

		return parsed;
	});
export const toNumber = __legacySolution;

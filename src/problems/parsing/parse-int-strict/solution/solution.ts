const __legacySolution = (function parseIntStrict(input: string): number | null {
		const trimmed = input.trim();
		if (!/^-?\d+$/.test(trimmed)) {
			return null;
		}

		const parsed = Number.parseInt(trimmed, 10);
		if (Number.isNaN(parsed)) {
			return null;
		}

		return parsed;
	});
export const parseIntStrict = __legacySolution;

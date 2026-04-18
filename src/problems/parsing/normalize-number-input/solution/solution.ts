const __legacySolution = (function normalizeNumberInput(input: string | number | null): number | null {
		if (input === null) {
			return null;
		}

		if (typeof input === 'number') {
			return Number.isFinite(input) ? input : null;
		}

		const trimmed = input.trim();
		if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
			return null;
		}

		const parsed = Number(trimmed);
		if (!Number.isFinite(parsed)) {
			return null;
		}

		return Object.is(parsed, -0) ? 0 : parsed;
	});
export const normalizeNumberInput = __legacySolution;

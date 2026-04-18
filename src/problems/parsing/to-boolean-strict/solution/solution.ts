const __legacySolution = (function toBooleanStrict(input: string): boolean | null {
		const normalized = input.trim().toLowerCase();
		if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
			return true;
		}

		if (normalized === 'false' || normalized === '0' || normalized === 'no') {
			return false;
		}

		return null;
	});
export const toBooleanStrict = __legacySolution;

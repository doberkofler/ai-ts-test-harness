const __legacySolution = (function queryParamCoercion(query: string): {page: number; limit: number; includeArchived: boolean} {
		const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);

		const parsePositiveInt = (value: string | null, fallback: number): number => {
			if (typeof value !== 'string' || !/^\d+$/.test(value)) {
				return fallback;
			}

			const parsed = Number.parseInt(value, 10);
			if (parsed <= 0) {
				return fallback;
			}

			return parsed;
		};

		const parseBoolean = (value: string | null, fallback: boolean): boolean => {
			if (typeof value !== 'string') {
				return fallback;
			}

			const normalized = value.trim().toLowerCase();
			if (normalized === 'true' || normalized === '1') {
				return true;
			}

			if (normalized === 'false' || normalized === '0') {
				return false;
			}

			return fallback;
		};

		return {
			page: parsePositiveInt(params.get('page'), 1),
			limit: parsePositiveInt(params.get('limit'), 20),
			includeArchived: parseBoolean(params.get('includeArchived'), false),
		};
	});
export const queryParamCoercion = __legacySolution;

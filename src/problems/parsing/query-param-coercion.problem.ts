import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'query-param-coercion',
	description: [
		'Parse URL query params into a typed object with page, limit, and includeArchived.',
		'Default page=1, limit=20, includeArchived=false when values are missing or invalid.',
	],
	signature: 'function queryParamCoercion(query: string): {page: number; limit: number; includeArchived: boolean}',
	solution: function queryParamCoercion(query: string): {page: number; limit: number; includeArchived: boolean} {
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
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation('?page=2&limit=50&includeArchived=true'), {
			page: 2,
			limit: 50,
			includeArchived: true,
		});
		assert.deepStrictEqual(implementation('page=-1&limit=0&includeArchived=TRUE'), {
			page: 1,
			limit: 20,
			includeArchived: true,
		});
		assert.deepStrictEqual(implementation(''), {
			page: 1,
			limit: 20,
			includeArchived: false,
		});
	},
});

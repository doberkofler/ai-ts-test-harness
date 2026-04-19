import {existsSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const ENTRY_NAME = 'sql10JsonAggregationQuery';
const normalizeSql = (sql: string): string => sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();
const resolveExistingFileUrl = (relativePaths: readonly string[]): URL => {
	for (const relativePath of relativePaths) {
		const candidate = new URL(relativePath, import.meta.url);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new TypeError(`Unable to resolve file from candidates: ${relativePaths.join(', ')}`);
};
const loadQuery = async (): Promise<string> => {
	const sourcePath = resolveExistingFileUrl(['./solution.ts', '../solution.ts', '../files/solution.ts']);
	const moduleNamespace: unknown = await import(sourcePath.href);
	if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
		throw new TypeError('Expected imported module to be an object');
	}

	const implementation = (moduleNamespace as Record<string, unknown>)[ENTRY_NAME];
	if (typeof implementation !== 'function') {
		throw new TypeError('Expected entry function export to exist');
	}

	const sql = implementation();
	if (typeof sql !== 'string') {
		throw new TypeError('Expected SQL query to be a string');
	}

	return normalizeSql(sql);
};

describe('sql-10-json-extraction-aggregation', () => {
	it('extracts jsonb type and aggregates counts for 2024', async () => {
		const sql = await loadQuery();
		expect(sql).toMatch(/payload->>'type'\s+as\s+event_type/);
		expect(sql).toMatch(/count\(\*\)\s+as\s+event_count/);
		expect(sql).toMatch(/from\s+events/);
		expect(sql).toMatch(/created_at\s+>=\s+timestamp\s+'2024-01-01\s+00:00:00'/);
		expect(sql).toMatch(/created_at\s+<\s+timestamp\s+'2025-01-01\s+00:00:00'/);
		expect(sql).toMatch(/payload->>'type'\s+is\s+not\s+null/);
		expect(sql).toMatch(/group\s+by\s+payload->>'type'/);
	});
});

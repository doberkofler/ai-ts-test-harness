import {existsSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const ENTRY_NAME = 'sql06PivotMonthlySales2024Query';
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

describe('sql-06-pivot-monthly-sales-2024', () => {
	it('uses conditional aggregation for all month aliases', async () => {
		const sql = await loadQuery();
		expect(sql).toMatch(/select\s+product_id/);
		expect(sql).toMatch(/sum\(case\s+when/);
		expect(sql).toMatch(/as\s+jan/);
		expect(sql).toMatch(/as\s+feb/);
		expect(sql).toMatch(/as\s+mar/);
		expect(sql).toMatch(/as\s+apr/);
		expect(sql).toMatch(/as\s+may/);
		expect(sql).toMatch(/as\s+jun/);
		expect(sql).toMatch(/as\s+jul/);
		expect(sql).toMatch(/as\s+aug/);
		expect(sql).toMatch(/as\s+sep/);
		expect(sql).toMatch(/as\s+oct/);
		expect(sql).toMatch(/as\s+nov/);
		expect(sql).toMatch(/as\s+dec/);
		expect(sql).toMatch(/where\s+sale_month\s+>=\s+date\s+'2024-01-01'/);
		expect(sql).toMatch(/and\s+sale_month\s+<\s+date\s+'2025-01-01'/);
		expect(sql).toMatch(/group\s+by\s+product_id/);
	});
});

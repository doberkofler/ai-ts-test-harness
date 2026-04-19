import {existsSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const ENTRY_NAME = 'sql07DeleteOldPendingOrdersQuery';
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

describe('sql-07-delete-correlated-subquery', () => {
	it('returns a correlated delete with all required filters', async () => {
		const sql = await loadQuery();
		expect(sql).toMatch(/delete\s+from\s+orders/);
		expect(sql).toMatch(/status\s*=\s*'pending'/);
		expect(sql).toMatch(/created_at\s*<\s*current_timestamp\s*-\s*interval\s+'90\s+days'/);
		expect(sql).toMatch(/select\s+count\(\*\)\s+from\s+orders/);
		expect(sql).toMatch(/o2\.customer_id\s*=\s*o\.customer_id/);
		expect(sql).toMatch(/\)\s*>\s*10/);
	});
});

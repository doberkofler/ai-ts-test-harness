import {existsSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const ENTRY_NAME = 'sql01DepartmentAverageSalaryQuery';
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

describe('sql-01-basic-join-with-aggregation', () => {
	it('returns a left-join aggregate query with required aliases', async () => {
		const sql = await loadQuery();
		expect(sql).toMatch(/d\.name\s+as\s+department_name/);
		expect(sql).toMatch(/avg\(e\.salary\)\s+as\s+avg_salary/);
		expect(sql).toMatch(/from\s+departments\s+as\s+d/);
		expect(sql).toMatch(/left\s+join\s+employees\s+as\s+e\s+on\s+e\.dept_id\s*=\s*d\.id/);
		expect(sql).toMatch(/group\s+by\s+d\.id,\s*d\.name|group\s+by\s+d\.name,\s*d\.id/);
		expect(sql).toMatch(/order\s+by\s+avg_salary\s+desc/);
	});
});

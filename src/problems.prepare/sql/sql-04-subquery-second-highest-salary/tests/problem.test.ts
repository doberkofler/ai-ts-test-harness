import {existsSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const ENTRY_NAME = 'sql04SecondHighestSalaryPerDepartmentQuery';
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

describe('sql-04-subquery-second-highest-salary', () => {
	it('uses a correlated subquery to target second-highest salary', async () => {
		const sql = await loadQuery();
		expect(sql).toMatch(/e\.dept_id/);
		expect(sql).toMatch(/e\.name\s+as\s+employee_name/);
		expect(sql).toMatch(/e\.salary/);
		expect(sql).toMatch(/where\s+1\s*=\s*\(\s*select\s+count\(distinct\s+e2\.salary\)/);
		expect(sql).toMatch(/e2\.dept_id\s*=\s*e\.dept_id/);
		expect(sql).toMatch(/e2\.salary\s*>\s*e\.salary/);
	});
});

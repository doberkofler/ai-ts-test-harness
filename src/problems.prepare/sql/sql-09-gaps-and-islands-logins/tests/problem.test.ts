import {existsSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const ENTRY_NAME = 'sql09ConsecutiveLoginRangesQuery';
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

describe('sql-09-gaps-and-islands-logins', () => {
	it('uses row-number based grouping for contiguous ranges', async () => {
		const sql = await loadQuery();
		expect(sql).toMatch(/row_number\(\)\s+over\s*\(\s*partition\s+by\s+user_id\s+order\s+by\s+login_date\s*\)/);
		expect(sql).toMatch(/login_date\s*-\s*\(rn\s*\*\s*interval\s+'1\s+day'\)\s+as\s+grp/);
		expect(sql).toMatch(/min\(login_date\)\s+as\s+start_date/);
		expect(sql).toMatch(/max\(login_date\)\s+as\s+end_date/);
		expect(sql).toMatch(/group\s+by\s+user_id,\s*grp/);
	});
});

import {existsSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const ENTRY_NAME = 'sql05CategoryHierarchyQuery';
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

describe('sql-05-recursive-cte-hierarchy-depth', () => {
	it('uses recursive cte with depth and path construction', async () => {
		const sql = await loadQuery();
		expect(sql).toMatch(/with\s+recursive/);
		expect(sql).toMatch(/union\s+all/);
		expect(sql).toMatch(/where\s+c\.parent_id\s+is\s+null/);
		expect(sql).toMatch(/ct\.depth\s*\+\s*1\s+as\s+depth/);
		expect(sql).toMatch(/ct\.path\s*\|\|\s*'\s*>\s*'\s*\|\|\s*c\.name\s+as\s+path/);
		expect(sql).toMatch(/select\s+id,\s*name,\s*depth,\s*path/);
	});
});

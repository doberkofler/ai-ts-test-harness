import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

const resolveExistingFileUrl = (relativePaths: readonly string[]): URL => {
	for (const relativePath of relativePaths) {
		const candidate = new URL(relativePath, import.meta.url);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new TypeError(`Unable to resolve file from candidates: ${relativePaths.join(', ')}`);
};

describe('package with private cache state', () => {
	it('defines package API and private associative cache in body', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+PACKAGE\s+order_cache\s+IS/i);
		assert.match(sql, /FUNCTION\s+get_total\s*\(\s*p_order_id\s+NUMBER\s*\)\s+RETURN\s+NUMBER/i);
		assert.match(sql, /PROCEDURE\s+invalidate\s*\(\s*p_order_id\s+NUMBER\s*\)/i);
		assert.match(sql, /PROCEDURE\s+clear_all/i);
		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+PACKAGE\s+BODY\s+order_cache/i);
		assert.match(sql, /INDEX\s+BY\s+PLS_INTEGER/i);
		assert.match(sql, /g_total_cache\.EXISTS\s*\(\s*p_order_id\s*\)/i);
		assert.match(sql, /SELECT\s+order_total\s+INTO\s+\w+\s+FROM\s+orders\s+WHERE\s+order_id\s*=\s*p_order_id/i);
		assert.match(sql, /g_total_cache\.DELETE\s*\(\s*p_order_id\s*\)/i);
		assert.match(sql, /g_total_cache\.DELETE\s*;/i);
	});
});

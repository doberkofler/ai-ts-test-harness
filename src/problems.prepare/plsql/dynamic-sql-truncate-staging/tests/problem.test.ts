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

describe('dynamic sql truncate staging tables', () => {
	it('uses ALL_TABLES, EXECUTE IMMEDIATE, and ORA-00942 handling', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+PROCEDURE\s+truncate_staging_tables/i);
		assert.match(sql, /p_truncated_count\s+OUT\s+NUMBER/i);
		assert.match(sql, /FROM\s+all_tables[\s\S]*owner\s*=\s*UPPER\s*\(\s*p_schema\s*\)/i);
		assert.match(sql, /table_name\s+LIKE\s+'STG_%'/i);
		assert.match(sql, /EXECUTE\s+IMMEDIATE\s+'TRUNCATE\s+TABLE/i);
		assert.match(sql, /SQLCODE\s*=\s*-942/i);
		assert.match(sql, /p_truncated_count\s*:=\s*p_truncated_count\s*\+\s*1/i);
	});
});

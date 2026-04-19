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

describe('stored procedure with cursor and exception handling', () => {
	it('includes required procedure behavior', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+PROCEDURE\s+process_overdue_orders\s*\(\s*p_days_overdue\s+IN\s+NUMBER/i);
		assert.match(sql, /p_days_overdue\s*<=\s*0/i);
		assert.match(sql, /raise_application_error\s*\(\s*-20001\s*,/i);
		assert.match(sql, /FROM\s+orders[\s\S]*status\s*=\s*'open'/i);
		assert.match(sql, /SYSDATE\s*-\s*p_days_overdue/i);
		assert.match(sql, /UPDATE\s+orders[\s\S]*SET\s+status\s*=\s*'overdue'/i);
		assert.match(sql, /INSERT\s+INTO\s+audit_log\s*\(\s*order_id\s*,\s*changed_at\s*,\s*reason\s*\)/i);
		assert.match(sql, /MOD\s*\(\s*\w+\s*,\s*500\s*\)\s*=\s*0[\s\S]*COMMIT/i);
	});
});

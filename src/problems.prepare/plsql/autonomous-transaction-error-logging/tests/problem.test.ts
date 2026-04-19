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

describe('autonomous transaction error logging', () => {
	it('declares autonomous transaction and commits insert', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+PROCEDURE\s+log_error/i);
		assert.match(sql, /PRAGMA\s+AUTONOMOUS_TRANSACTION/i);
		assert.match(sql, /INSERT\s+INTO\s+error_log\s*\(\s*proc_name\s*,\s*error_code\s*,\s*error_msg\s*,\s*logged_at\s*\)/i);
		assert.match(sql, /VALUES\s*\(\s*p_proc_name\s*,\s*p_error_code\s*,\s*p_error_msg\s*,\s*SYSDATE\s*\)/i);
		assert.match(sql, /COMMIT/i);
	});
});

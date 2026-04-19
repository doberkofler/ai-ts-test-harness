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

describe('hierarchical management chain query', () => {
	it('uses CONNECT BY PRIOR and SYS_CONNECT_BY_PATH for employee 42 chain', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /SELECT[\s\S]*LEVEL/i);
		assert.match(sql, /SYS_CONNECT_BY_PATH\s*\(/i);
		assert.match(sql, /FROM\s+employees/i);
		assert.match(sql, /START\s+WITH\s+manager_id\s+IS\s+NULL/i);
		assert.match(sql, /CONNECT\s+BY\s+PRIOR\s+id\s*=\s*manager_id/i);
		assert.match(sql, /START\s+WITH\s+id\s*=\s*42/i);
		assert.match(sql, /CONNECT\s+BY\s+PRIOR\s+manager_id\s*=\s*id/i);
	});
});

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

describe('ref cursor returned to caller', () => {
	it('opens SYS_REFCURSOR with expected query ordering', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+PROCEDURE\s+get_orders_by_status/i);
		assert.match(sql, /p_cursor\s+OUT\s+SYS_REFCURSOR/i);
		assert.match(sql, /OPEN\s+p_cursor\s+FOR/i);
		assert.match(sql, /SELECT\s+\*\s+FROM\s+orders/i);
		assert.match(sql, /WHERE\s+status\s*=\s*p_status/i);
		assert.match(sql, /ORDER\s+BY\s+created_at\s+DESC/i);
	});
});

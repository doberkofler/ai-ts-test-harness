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

describe('trigger audit trail on update', () => {
	it('contains row-level after update trigger and per-column inserts', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+TRIGGER\s+\w+/i);
		assert.match(sql, /AFTER\s+UPDATE\s+ON\s+products/i);
		assert.match(sql, /FOR\s+EACH\s+ROW/i);
		assert.match(sql, /INSERT\s+INTO\s+product_audit\s*\(\s*product_id\s*,\s*column_name\s*,\s*old_value\s*,\s*new_value\s*,\s*changed_by\s*,\s*changed_at\s*\)/i);
		assert.match(sql, /USER\s*,\s*SYSDATE/i);
		assert.match(sql, /'product_name'/i);
		assert.match(sql, /'description'/i);
		assert.match(sql, /'price'/i);
		assert.match(sql, /'status'/i);
		assert.match(sql, /'stock_qty'/i);
	});
});

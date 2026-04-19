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

describe('bulk collect plus forall dml', () => {
	it('uses BULK COLLECT and FORALL for required deletes', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /SELECT\s+customer_id\s+BULK\s+COLLECT\s+INTO/i);
		assert.match(sql, /FROM\s+customers[\s\S]*status\s*=\s*'inactive'/i);
		assert.match(sql, /last_order_date\s*<\s*\(?\s*SYSDATE\s*-\s*365/i);
		assert.match(sql, /FORALL\s+\w+\s+IN\s+1\s*\.\.\s*\w+\.COUNT[\s\S]*DELETE\s+FROM\s+orders/i);
		assert.match(sql, /FORALL\s+\w+\s+IN\s+1\s*\.\.\s*\w+\.COUNT[\s\S]*DELETE\s+FROM\s+customers/i);
		assert.match(sql, /DBMS_OUTPUT\.PUT_LINE\s*\(/i);
	});
});

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

describe('dbms scheduler interval job', () => {
	it('creates expected cleanup job configuration', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /DBMS_SCHEDULER\.CREATE_JOB\s*\(/i);
		assert.match(sql, /job_name\s*=>\s*'CLEANUP_EXPIRED_TOKENS'/i);
		assert.match(sql, /job_action\s*=>\s*'SECURITY_PKG\.PURGE_EXPIRED_TOKENS'/i);
		assert.match(sql, /repeat_interval\s*=>\s*'FREQ=HOURLY;INTERVAL=6'/i);
		assert.match(sql, /enabled\s*=>\s*TRUE/i);
		assert.match(sql, /auto_drop\s*=>\s*FALSE/i);
		assert.match(sql, /DBMS_SCHEDULER\.SET_ATTRIBUTE\s*\(/i);
		assert.match(sql, /attribute\s*=>\s*'max_failures'/i);
		assert.match(sql, /value\s*=>\s*3/i);
	});
});

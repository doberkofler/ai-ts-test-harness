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

describe('pipelined function by department', () => {
	it('defines types and streams rows using PIPE ROW', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.sql', '../solution.sql', '../files/solution.sql']);
		const sql = readFileSync(sourcePath, 'utf8');

		assert.match(sql, /CREATE\s+TYPE\s+t_employee_row\s+AS\s+OBJECT/i);
		assert.match(sql, /CREATE\s+TYPE\s+t_employee_tab\s+AS\s+TABLE\s+OF\s+t_employee_row/i);
		assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+get_employees_by_dept\s*\(\s*p_dept_id\s+NUMBER\s*\)/i);
		assert.match(sql, /RETURN\s+t_employee_tab\s+PIPELINED/i);
		assert.match(sql, /FROM\s+employees[\s\S]*WHERE\s+department_id\s*=\s*p_dept_id/i);
		assert.match(sql, /PIPE\s+ROW\s*\(/i);
	});
});

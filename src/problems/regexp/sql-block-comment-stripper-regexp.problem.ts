import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'sql-block-comment-stripper-regexp',
	description: [
		'Return a global dotAll RegExp that matches SQL block comments.',
		'Must remove /* ... */ blocks non-greedily across lines while preserving -- comments.',
	],
	signature: 'function sqlBlockCommentStripperRegexp(): RegExp',
	solution: function sqlBlockCommentStripperRegexp(): RegExp {
		return /\/\*.*?\*\//gs;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const sql = `SELECT *
/* this is
   a block comment */
FROM users -- inline comment
/* another
block */
WHERE id = 1`;

		const stripped = sql
			.replaceAll(regexp, '')
			.replaceAll(/\n{2,}/g, '\n')
			.trim();
		assert.strictEqual(stripped.includes('SELECT *'), true);
		assert.strictEqual(stripped.includes('FROM users -- inline comment'), true);
		assert.strictEqual(stripped.includes('WHERE id = 1'), true);
		assert.strictEqual(stripped.includes('block comment'), false);
		assert.strictEqual(stripped.includes('another'), false);
	},
});

import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'repeated-word-backreference',
	description: [
		'Return a case-insensitive RegExp that detects consecutive repeated words.',
		'Require word boundaries and at least one separating whitespace run.',
	],
	signature: 'function repeatedWordBackreference(): RegExp',
	solution: function repeatedWordBackreference(): RegExp {
		return /\b(\w+)\b\s+\1\b/i;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('the the fox'), true);
		assert.strictEqual(regexp.test('This this is wrong'), true);
		assert.strictEqual(regexp.test('foo  foo'), true);
		assert.strictEqual(regexp.test('thesis'), false);
		assert.strictEqual(regexp.test('the fox'), false);
		assert.strictEqual(regexp.test('thethe'), false);
	},
});

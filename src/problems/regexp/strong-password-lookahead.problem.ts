import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'strong-password-lookahead',
	description: [
		'Return a RegExp for strong passwords using positive lookaheads.',
		'Require at least one uppercase, lowercase, digit, and one special from !@#$%^&* with minimum length 8.',
	],
	signature: 'function strongPasswordLookahead(): RegExp',
	solution: function strongPasswordLookahead(): RegExp {
		return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('Abcdef1!'), true);
		assert.strictEqual(regexp.test('P@ssw0rd'), true);
		assert.strictEqual(regexp.test('C0mpl3x!Pass'), true);
		assert.strictEqual(regexp.test('abcdef1!'), false);
		assert.strictEqual(regexp.test('ABCDEF1!'), false);
		assert.strictEqual(regexp.test('Abcdefgh!'), false);
		assert.strictEqual(regexp.test('Abcdef12'), false);
		assert.strictEqual(regexp.test('Ab1!'), false);
	},
});

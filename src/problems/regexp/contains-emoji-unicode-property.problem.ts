import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'contains-emoji-unicode-property',
	description: [
		'Return a Unicode RegExp that matches strings containing at least one emoji presentation character.',
		'Use Unicode property escapes with the u flag.',
	],
	signature: 'function containsEmojiUnicodeProperty(): RegExp',
	solution: function containsEmojiUnicodeProperty(): RegExp {
		return /\p{Emoji_Presentation}/u;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('Hello 👋'), true);
		assert.strictEqual(regexp.test('🔥'), true);
		assert.strictEqual(regexp.test('test 😀 foo'), true);
		assert.strictEqual(regexp.test('Hello world'), false);
		assert.strictEqual(regexp.test('No emoji here: 42'), false);
	},
});

import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'whole-word-cafe-unicode',
	description: [
		'Return a Unicode-aware RegExp that matches whole-word "cafe with accent" only.',
		'Match standalone "café" and reject embedded forms like "caféteria" or "decafé".',
	],
	signature: 'function wholeWordCafeUnicode(): RegExp',
	solution: function wholeWordCafeUnicode(): RegExp {
		return /(?<!\p{L})café(?!\p{L})/u;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('I had café today'), true);
		assert.strictEqual(regexp.test('café'), true);
		assert.strictEqual(regexp.test('caféteria'), false);
		assert.strictEqual(regexp.test('decafé'), false);
	},
});

import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'css-hex-color',
	description: ['Return a RegExp for CSS hex colors with # prefix.', 'Accept 3, 4, 6, or 8 hex digits and reject invalid lengths/characters.'],
	signature: 'function cssHexColor(): RegExp',
	solution: function cssHexColor(): RegExp {
		return /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('#fff'), true);
		assert.strictEqual(regexp.test('#FFF'), true);
		assert.strictEqual(regexp.test('#aabbcc'), true);
		assert.strictEqual(regexp.test('#AABBCCDD'), true);
		assert.strictEqual(regexp.test('#a1b2'), true);
		assert.strictEqual(regexp.test('#gg0000'), false);
		assert.strictEqual(regexp.test('#12345'), false);
		assert.strictEqual(regexp.test('#'), false);
		assert.strictEqual(regexp.test('aabbcc'), false);
	},
});

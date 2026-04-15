import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'pixel-value-strict',
	description: ['Return an anchored RegExp for pixel values in the form digits followed by px.', 'Reject missing numeric prefixes and extra suffixes.'],
	signature: 'function pixelValueStrict(): RegExp',
	solution: function pixelValueStrict(): RegExp {
		return /^\d+px$/;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('12px'), true);
		assert.strictEqual(regexp.test('0px'), true);
		assert.strictEqual(regexp.test('1000px'), true);
		assert.strictEqual(regexp.test('px'), false);
		assert.strictEqual(regexp.test('12'), false);
		assert.strictEqual(regexp.test('12em'), false);
		assert.strictEqual(regexp.test('12pxpx'), false);
	},
});

import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'iban-format-europe-subset',
	description: [
		'Return a RegExp that validates IBAN format for a Europe-focused subset.',
		'Require uppercase country code, two check digits, and up to 30 alphanumeric characters.',
	],
	signature: 'function ibanFormatEuropeSubset(): RegExp',
	solution: function ibanFormatEuropeSubset(): RegExp {
		return /^[A-Z]{2}\d{2}[A-Z\d]{1,30}$/;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('GB29NWBK60161331926819'), true);
		assert.strictEqual(regexp.test('DE89370400440532013000'), true);
		assert.strictEqual(regexp.test('FR7614508059144972956460695'), true);
		assert.strictEqual(regexp.test('gb29NWBK60161331926819'), false);
		assert.strictEqual(regexp.test('G29NWBK60161331926819'), false);
		assert.strictEqual(regexp.test('GB2960161331926819NWBK00000000000000000'), false);
	},
});

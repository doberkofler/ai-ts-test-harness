import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'non-currency-float-lookbehind',
	description: [
		'Return a RegExp that matches floating-point numbers not preceded by $ or euro symbol.',
		'Use negative lookbehind and extract matches with exec or matchAll.',
	],
	signature: 'function nonCurrencyFloatLookbehind(): RegExp',
	solution: function nonCurrencyFloatLookbehind(): RegExp {
		return /(?<![$€])\b\d+\.\d+\b/;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const a = regexp.exec('value is 3.14');
		assert.ok(a !== null);
		if (a === null) {
			return;
		}
		assert.strictEqual(a[0], '3.14');

		const b = regexp.exec('ratio: 0.5');
		assert.ok(b !== null);
		if (b === null) {
			return;
		}
		assert.strictEqual(b[0], '0.5');

		assert.strictEqual(regexp.exec('$3.14'), null);
		assert.strictEqual(regexp.exec('€9.99'), null);
		assert.ok(regexp.exec('£2.50') !== null);
	},
});

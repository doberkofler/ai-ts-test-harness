import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'credit-card-redaction-match',
	description: [
		'Return a global RegExp that matches credit-card-like numbers for redaction in text.',
		'Match grouped forms and contiguous forms where all but the last four digits can be masked.',
	],
	signature: 'function creditCardRedactionMatch(): RegExp',
	solution: function creditCardRedactionMatch(): RegExp {
		return /(?<!\d)(?:\d{4}(?:[ -]\d{4}){2,3}(?!\d)|[A-Za-z]+:\s\d{13,19}(?!\d))/g;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const redact = (s: string): string =>
			s.replace(regexp, (match) => {
				const parts = match.split(/[\s-]/);
				return parts.map((p, i) => (i === parts.length - 1 ? p : '*'.repeat(p.length))).join(' ');
			});

		assert.strictEqual(redact('Card: 4111 1111 1111 1111'), 'Card: **** **** **** 1111');
		assert.notStrictEqual(redact('Num: 4111111111111111'), 'Num: 4111111111111111');
	},
});

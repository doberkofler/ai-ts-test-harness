import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'to-number-manual',
	description: [
		'Parse a string to a number by manually inspecting each character.',
		'Trim whitespace before parsing.',
		'Return null if the string is empty, blank, or contains any non-numeric characters.',
		'Support an optional leading minus sign and a single decimal point.',
		'Do NOT use parseFloat, parseInt, Number(), +, or any built-in string-to-number conversion.',
	],
	signature: 'function toNumber(s: string): number | null',
	solution: function toNumber(s: string): number | null {
		const trimmed = s.trim();
		if (trimmed.length === 0) {
			return null;
		}

		let sign = 1;
		let index = 0;
		if (trimmed[index] === '-') {
			sign = -1;
			index = 1;
		}

		if (index >= trimmed.length) {
			return null;
		}

		let seenDot = false;
		let seenDigit = false;
		let intPart = 0;
		let fracPart = 0;
		let fracScale = 1;

		for (; index < trimmed.length; index++) {
			const ch = trimmed[index];
			if (ch === '.') {
				if (seenDot) {
					return null;
				}
				seenDot = true;
				continue;
			}

			if (typeof ch !== 'string') {
				return null;
			}

			const code = ch.charCodeAt(0);
			if (code < 48 || code > 57) {
				return null;
			}

			seenDigit = true;
			const digit = code - 48;
			if (seenDot) {
				fracPart = fracPart * 10 + digit;
				fracScale *= 10;
			} else {
				intPart = intPart * 10 + digit;
			}
		}

		if (!seenDigit) {
			return null;
		}

		if (seenDot && fracScale === 1) {
			return null;
		}

		const value = intPart + fracPart / fracScale;
		if (value === 0) {
			return 0;
		}

		return sign * value;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('42'), 42);
		assert.strictEqual(implementation('3.14'), 3.14);
		assert.strictEqual(implementation('-7'), -7);
		assert.strictEqual(implementation('-3.14'), -3.14);
		assert.strictEqual(implementation('  42  '), 42);
		assert.strictEqual(implementation('abc'), null);
		assert.strictEqual(implementation(''), null);
		assert.strictEqual(implementation('   '), null);
		assert.strictEqual(implementation('12abc'), null);
		assert.strictEqual(implementation('1.2.3'), null);
		assert.strictEqual(implementation('-'), null);
		assert.strictEqual(implementation('-.'), null);
		assert.strictEqual(implementation('.'), null);
		assert.strictEqual(implementation('Infinity'), null);
		assert.strictEqual(implementation('-0'), 0);
		assert.strictEqual(implementation('007'), 7);
		assert.strictEqual(implementation('1+2'), null);
		assert.strictEqual(implementation('1-2'), null);
		assert.strictEqual(implementation('+-1'), null);
		assert.strictEqual(implementation('--1'), null);
		assert.strictEqual(implementation('++1'), null);
		assert.strictEqual(implementation('1.'), null);
	},
});

import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'sticky-expression-tokenizer',
	description: [
		'Return a sticky RegExp token matcher for simple expressions.',
		'Match integers, operators, lowercase identifiers, and whitespace for skipping.',
	],
	signature: 'function stickyExpressionTokenizer(): RegExp',
	solution: function stickyExpressionTokenizer(): RegExp {
		return /\s+|\d+|[+\-*/]|[a-z]+/y;
	},
	tests: ({assert, implementation}) => {
		const token = implementation();
		assert.ok(token instanceof RegExp);
		if (!(token instanceof RegExp)) {
			return;
		}

		const tokenize = (input: string): string[] => {
			const tokens: string[] = [];
			token.lastIndex = 0;
			while (token.lastIndex < input.length) {
				const match = token.exec(input);
				if (match === null) {
					throw new Error(`Unexpected char at ${token.lastIndex}`);
				}
				if (!match[0].trim()) {
					continue;
				}
				tokens.push(match[0]);
			}
			return tokens;
		};

		assert.deepStrictEqual(tokenize('x + 12 * y'), ['x', '+', '12', '*', 'y']);
		assert.deepStrictEqual(tokenize('42 - z'), ['42', '-', 'z']);
	},
});

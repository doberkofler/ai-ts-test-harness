import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'valid-parentheses',
	category: 'algorithms',
	description: 'Return true if the input string has valid and correctly nested (), [], and {} pairs.',
	signature: 'function validParentheses(input: string): boolean',
	solution: function validParentheses(input: string): boolean {
		const closingToOpening: Record<string, string> = {')': '(', ']': '[', '}': '{'};
		const opening = new Set<string>(['(', '[', '{']);
		const stack: string[] = [];

		for (const char of input) {
			if (opening.has(char)) {
				stack.push(char);
				continue;
			}

			const expectedOpening = closingToOpening[char];
			if (typeof expectedOpening !== 'string') {
				return false;
			}

			const previous = stack.pop();
			if (previous !== expectedOpening) {
				return false;
			}
		}

		return stack.length === 0;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('()[]{}'), true);
		assert.strictEqual(implementation('([{}])'), true);
		assert.strictEqual(implementation('(]'), false);
		assert.strictEqual(implementation('([)]'), false);
		assert.strictEqual(implementation('((('), false);
	},
});

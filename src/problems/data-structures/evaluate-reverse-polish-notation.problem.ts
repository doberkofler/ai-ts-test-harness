import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'evaluate-reverse-polish-notation',
	description: 'Evaluate a reverse Polish notation expression. Division truncates toward zero.',
	signature: 'function evaluateReversePolishNotation(tokens: string[]): number',
	solution: function evaluateReversePolishNotation(tokens: string[]): number {
		const stack: number[] = [];
		const operators = new Set(['+', '-', '*', '/']);

		for (const token of tokens) {
			if (!operators.has(token)) {
				stack.push(Number(token));
				continue;
			}

			const right = stack.pop();
			const left = stack.pop();
			if (typeof left !== 'number' || typeof right !== 'number') {
				throw new TypeError('invalid reverse Polish notation expression');
			}

			if (token === '+') {
				stack.push(left + right);
			} else if (token === '-') {
				stack.push(left - right);
			} else if (token === '*') {
				stack.push(left * right);
			} else {
				stack.push(Math.trunc(left / right));
			}
		}

		const result = stack.pop();
		if (typeof result !== 'number' || stack.length > 0) {
			throw new TypeError('invalid reverse Polish notation expression');
		}

		return result;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation(['2', '1', '+', '3', '*']), 9);
		assert.strictEqual(implementation(['4', '13', '5', '/', '+']), 6);
		assert.strictEqual(implementation(['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']), 22);
		assert.strictEqual(implementation(['7', '-3', '/']), -2);
	},
});

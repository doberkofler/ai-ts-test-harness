const __legacySolution = (function evaluateReversePolishNotation(tokens: string[]): number {
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
	});
export const evaluateReversePolishNotation = __legacySolution;

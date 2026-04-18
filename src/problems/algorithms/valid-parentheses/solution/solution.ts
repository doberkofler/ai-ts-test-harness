const __legacySolution = (function validParentheses(input: string): boolean {
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
	});
export const validParentheses = __legacySolution;

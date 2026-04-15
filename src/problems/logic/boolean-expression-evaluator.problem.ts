import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'boolean-expression-evaluator',
	description: [
		'Evaluate a boolean expression with literals true/false, operators !, &&, ||, and parentheses.',
		'Operator precedence is ! first, then &&, then ||.',
	],
	signature: 'function evaluateBooleanExpression(expression: string): boolean',
	solution: function evaluateBooleanExpression(expression: string): boolean {
		type Token = {type: 'literal'; value: boolean} | {type: 'and'} | {type: 'or'} | {type: 'not'} | {type: 'open'} | {type: 'close'};

		type Operator = 'and' | 'or' | 'not' | 'open';

		const tokenize = (source: string): Token[] => {
			const trimmed = source.trim();
			const tokens: Token[] = [];
			let index = 0;

			while (index < trimmed.length) {
				const char = trimmed[index];
				if (typeof char !== 'string') {
					break;
				}

				if (/\s/u.test(char)) {
					index += 1;
				} else if (trimmed.startsWith('true', index)) {
					tokens.push({type: 'literal', value: true});
					index += 4;
				} else if (trimmed.startsWith('false', index)) {
					tokens.push({type: 'literal', value: false});
					index += 5;
				} else if (trimmed.startsWith('&&', index)) {
					tokens.push({type: 'and'});
					index += 2;
				} else if (trimmed.startsWith('||', index)) {
					tokens.push({type: 'or'});
					index += 2;
				} else if (char === '!') {
					tokens.push({type: 'not'});
					index += 1;
				} else if (char === '(') {
					tokens.push({type: 'open'});
					index += 1;
				} else if (char === ')') {
					tokens.push({type: 'close'});
					index += 1;
				} else {
					throw new SyntaxError(`Unexpected character at index ${index}`);
				}
			}

			return tokens;
		};

		const operatorPrecedence: Readonly<Record<Exclude<Operator, 'open'>, number>> = {
			not: 3,
			and: 2,
			or: 1,
		};

		const tokens = tokenize(expression);
		const values: boolean[] = [];
		const operators: Operator[] = [];
		let expectsOperand = true;

		const applyOperator = (): void => {
			const operator = operators.pop();
			if (operator === 'not') {
				const operand = values.pop();
				if (typeof operand !== 'boolean') {
					throw new SyntaxError('Missing operand for !');
				}
				values.push(!operand);
				return;
			}

			if (operator === 'and' || operator === 'or') {
				const right = values.pop();
				const left = values.pop();
				if (typeof left !== 'boolean' || typeof right !== 'boolean') {
					throw new SyntaxError('Missing operand for binary operator');
				}
				values.push(operator === 'and' ? left && right : left || right);
				return;
			}

			if (operator === 'open') {
				throw new SyntaxError('Mismatched opening parenthesis');
			}

			throw new SyntaxError('Unknown operator');
		};

		for (const token of tokens) {
			if (token.type === 'literal') {
				if (!expectsOperand) {
					throw new SyntaxError('Unexpected literal');
				}
				values.push(token.value);
				expectsOperand = false;
				while (operators.at(-1) === 'not') {
					applyOperator();
				}
				continue;
			}

			if (token.type === 'not') {
				if (!expectsOperand) {
					throw new SyntaxError('Unexpected ! operator');
				}
				operators.push('not');
				continue;
			}

			if (token.type === 'open') {
				if (!expectsOperand) {
					throw new SyntaxError('Unexpected opening parenthesis');
				}
				operators.push('open');
				continue;
			}

			if (token.type === 'close') {
				if (expectsOperand) {
					throw new SyntaxError('Unexpected closing parenthesis');
				}

				while (operators.at(-1) !== 'open') {
					if (operators.length === 0) {
						throw new SyntaxError('Mismatched closing parenthesis');
					}
					applyOperator();
				}

				operators.pop();
				while (operators.at(-1) === 'not') {
					applyOperator();
				}
				continue;
			}

			const currentOperator: Exclude<Operator, 'open'> = token.type;
			if (expectsOperand) {
				throw new SyntaxError('Unexpected binary operator');
			}

			while (operators.length > 0) {
				const top = operators.at(-1);
				if (typeof top !== 'string' || top === 'open') {
					break;
				}

				const topPrecedence = operatorPrecedence[top];
				const currentPrecedence = operatorPrecedence[currentOperator];
				if (topPrecedence < currentPrecedence) {
					break;
				}

				applyOperator();
			}

			operators.push(currentOperator);
			expectsOperand = true;
		}

		if (expectsOperand && tokens.length > 0) {
			throw new SyntaxError('Expression ended unexpectedly');
		}

		while (operators.length > 0) {
			applyOperator();
		}

		const result = values.pop();
		if (typeof result !== 'boolean' || values.length > 0) {
			throw new SyntaxError('Expression could not be evaluated');
		}

		return result;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('true'), true);
		assert.strictEqual(implementation('false'), false);
		assert.strictEqual(implementation('!false'), true);
		assert.strictEqual(implementation('true && false || true'), true);
		assert.strictEqual(implementation('true && (false || true)'), true);
		assert.strictEqual(implementation('!(true && (false || !false))'), false);
		assert.strictEqual(implementation('false || false || true && false'), false);
	},
});

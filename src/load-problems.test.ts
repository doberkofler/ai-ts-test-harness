import {describe, expect, test} from 'vitest';
import {parseProblemDefinition} from './load-problems.ts';

describe('parseProblemDefinition', () => {
	test('parses implement-function definitions', () => {
		const markdown = [
			'## kind',
			'implement-function',
			'',
			'## category',
			'arithmetic',
			'',
			'## description',
			'- Add two values.',
			'- Return the result.',
			'',
			'## signature',
			'```ts',
			'function add(a: number, b: number): number',
			'```',
			'',
			'## tests',
			'```ts',
			'assert.strictEqual(add(1, 2), 3);',
			'```',
		].join('\n');

		const parsed = parseProblemDefinition('/tmp/001-add.md', markdown);
		expect(parsed).toEqual({
			name: 'add',
			category: 'arithmetic',
			kind: 'implement-function',
			description: ['Add two values.', 'Return the result.'],
			signature: 'function add(a: number, b: number): number',
			tests: 'assert.strictEqual(add(1, 2), 3);',
		});
	});

	test('parses direct-refactor definitions', () => {
		const markdown = [
			'## kind',
			'direct-refactor',
			'',
			'## category',
			'refactor',
			'',
			'## description',
			'- Rewrite declaration as an expression.',
			'',
			'## input',
			'```ts',
			'function run(): void {}',
			'```',
			'',
			'## tests',
			'```ts',
			'assert.match(result, /const run/);',
			'```',
		].join('\n');

		const parsed = parseProblemDefinition('/tmp/002-declarationToExpression.md', markdown);
		expect(parsed).toEqual({
			name: 'declarationToExpression',
			category: 'refactor',
			kind: 'direct-refactor',
			description: ['Rewrite declaration as an expression.'],
			input: 'function run(): void {}',
			tests: 'assert.match(result, /const run/);',
		});
	});

	test('defaults kind to implement-function when omitted', () => {
		const markdown = [
			'## category',
			'arithmetic',
			'',
			'## description',
			'- Add two values.',
			'',
			'## signature',
			'```ts',
			'function add(a: number, b: number): number',
			'```',
			'',
			'## tests',
			'```ts',
			'assert.strictEqual(add(1, 2), 3);',
			'```',
		].join('\n');

		const parsed = parseProblemDefinition('/tmp/001-add.md', markdown);
		expect(parsed.kind).toBe('implement-function');
	});

	test('throws when direct-refactor input is missing', () => {
		const markdown = [
			'## kind',
			'direct-refactor',
			'',
			'## category',
			'refactor',
			'',
			'## description',
			'- Rename identifiers.',
			'',
			'## tests',
			'```ts',
			'assert.match(result, /rename/);',
			'```',
		].join('\n');

		expect(() => parseProblemDefinition('/tmp/001-rename.md', markdown)).toThrow('direct-refactor problems must include an input section');
	});

	test('throws when implement-function signature is missing', () => {
		const markdown = [
			'## kind',
			'implement-function',
			'',
			'## category',
			'arithmetic',
			'',
			'## description',
			'- Add two values.',
			'',
			'## tests',
			'```ts',
			'assert.strictEqual(add(1, 2), 3);',
			'```',
		].join('\n');

		expect(() => parseProblemDefinition('/tmp/001-add.md', markdown)).toThrow('implement-function problems must include a signature section');
	});

	test('throws when category is missing', () => {
		const markdown = [
			'## kind',
			'implement-function',
			'',
			'## description',
			'- Add two values.',
			'',
			'## signature',
			'```ts',
			'function add(a: number, b: number): number',
			'```',
			'',
			'## tests',
			'```ts',
			'assert.strictEqual(add(1, 2), 3);',
			'```',
		].join('\n');

		expect(() => parseProblemDefinition('/tmp/001-add.md', markdown)).toThrow('problems must include a category section');
	});
});

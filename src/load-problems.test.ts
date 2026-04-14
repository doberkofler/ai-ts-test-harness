import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {loadProblems} from './load-problems.ts';

const createTempProblemsDir = (): string => mkdtempSync(join(tmpdir(), 'problem-loader-'));

describe('loadProblems', () => {
	test('loads .problem.ts files recursively and sorts by path', () => {
		const root = createTempProblemsDir();

		try {
			mkdirSync(join(root, 'logic'), {recursive: true});
			mkdirSync(join(root, 'algorithms'), {recursive: true});
			mkdirSync(join(root, 'refactor', 'loops'), {recursive: true});

			writeFileSync(
				join(root, 'logic', 'fizzbuzz.problem.ts'),
				[
					`import {defineImplementProblem} from '#problem-api';`,
					``,
					`export default defineImplementProblem({`,
					`\tname: 'fizzbuzz',`,
					`\tdescription: ['FizzBuzz output'],`,
					`\tsignature: 'function fizzbuzz(n: number): string',`,
					`\ttests: ({assert}) => {`,
					`\t\tassert.strictEqual(true, true);`,
					`\t},`,
					`});`,
				].join('\n'),
				'utf8',
			);

			writeFileSync(
				join(root, 'algorithms', 'add.problem.ts'),
				[
					`import {defineImplementProblem} from '#problem-api';`,
					``,
					`export default defineImplementProblem({`,
					`\tname: 'add',`,
					`\tdescription: ['Add values'],`,
					`\tsignature: 'function add(a: number, b: number): number',`,
					`\ttests: ({assert}) => {`,
					`\t\tassert.strictEqual(true, true);`,
					`\t},`,
					`});`,
				].join('\n'),
				'utf8',
			);

			writeFileSync(
				join(root, 'refactor', 'loops', 'for-loop.problem.ts'),
				[
					`import {defineRefactorProblem} from '#problem-api';`,
					``,
					`export default defineRefactorProblem({`,
					`\tname: 'for-loop',`,
					`\tdescription: ['Use for...of'],`,
					`\tinput: 'function sum(values: number[]): number { return values.length; }',`,
					`\tentry: 'sum',`,
					`\ttests: ({assert}) => {`,
					`\t\tassert.strictEqual(true, true);`,
					`\t},`,
					`});`,
				].join('\n'),
				'utf8',
			);

			const loaded = loadProblems(root);
			expect(loaded.map((problem) => problem.name)).toEqual(['add', 'fizzbuzz', 'for-loop']);
			expect(loaded.map((problem) => problem.category)).toEqual(['algorithms', 'logic', 'refactor/loops']);
			expect(loaded[2]).toMatchObject({kind: 'direct-refactor', entry: 'sum'});
		} finally {
			rmSync(root, {recursive: true, force: true});
		}
	});

	test('throws when exported name does not match file name', () => {
		const root = createTempProblemsDir();

		try {
			mkdirSync(join(root, 'logic'), {recursive: true});
			writeFileSync(
				join(root, 'logic', 'fizzbuzz.problem.ts'),
				[
					`import {defineImplementProblem} from '#problem-api';`,
					``,
					`export default defineImplementProblem({`,
					`\tname: 'wrong-name',`,
					`\tdescription: ['bad name'],`,
					`\tsignature: 'function fizzbuzz(n: number): string',`,
					`\ttests: ({assert}) => {`,
					`\t\tassert.strictEqual(true, true);`,
					`\t},`,
					`});`,
				].join('\n'),
				'utf8',
			);

			expect(() => loadProblems(root)).toThrow('Problem name mismatch');
		} finally {
			rmSync(root, {recursive: true, force: true});
		}
	});

	test('loads function-based tests', () => {
		const root = createTempProblemsDir();

		try {
			mkdirSync(join(root, 'logic'), {recursive: true});
			writeFileSync(
				join(root, 'logic', 'callable-tests.problem.ts'),
				[
					`import {defineImplementProblem} from '#problem-api';`,
					``,
					`export default defineImplementProblem({`,
					`\tname: 'callable-tests',`,
					`\tdescription: ['function tests'],`,
					`\tsignature: 'function callableTests(input: number): number',`,
					`\ttests: ({assert}) => {`,
					`\t\tassert.ok(true);`,
					`\t},`,
					`});`,
				].join('\n'),
				'utf8',
			);

			const [loaded] = loadProblems(root);
			if (!loaded) {
				throw new TypeError('expected one loaded problem');
			}
			if (typeof loaded.tests !== 'function') {
				throw new TypeError('expected tests callback');
			}
		} finally {
			rmSync(root, {recursive: true, force: true});
		}
	});

	test('supports string descriptions and callback solutions', () => {
		const root = createTempProblemsDir();

		try {
			mkdirSync(join(root, 'logic'), {recursive: true});
			writeFileSync(
				join(root, 'logic', 'description-and-solution.problem.ts'),
				[
					`import {defineImplementProblem} from '#problem-api';`,
					``,
					`export default defineImplementProblem({`,
					`\tname: 'description-and-solution',`,
					`\tdescription: 'single line description',`,
					`\tsignature: 'function descriptionAndSolution(): number',`,
					`\tsolution: function descriptionAndSolution(): number { return 1; },`,
					`\ttests: ({assert}) => {`,
					`\t\tassert.strictEqual(true, true);`,
					`\t},`,
					`});`,
				].join('\n'),
				'utf8',
			);

			const [loaded] = loadProblems(root);
			if (!loaded || loaded.kind === 'direct-refactor') {
				throw new TypeError('expected implement-function problem');
			}

			expect(loaded.description).toBe('single line description');
			if (typeof loaded.solution !== 'function') {
				throw new TypeError('expected solution callback');
			}
			expect(loaded.solution.toString()).toContain('descriptionAndSolution');
		} finally {
			rmSync(root, {recursive: true, force: true});
		}
	});
});

import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {loadProblems} from './load-problems.ts';

const createTempProblemsDir = (): string => mkdtempSync(join(tmpdir(), 'problem-loader-'));

const writeJson = (filePath: string, value: unknown): void => {
	writeFileSync(filePath, `${JSON.stringify(value, undefined, 2)}\n`, 'utf8');
};

describe('loadProblems', () => {
	test('loads problem directories recursively and sorts by path', () => {
		const root = createTempProblemsDir();

		try {
			const addDir = join(root, 'algorithms', 'add');
			const fizzbuzzDir = join(root, 'logic', 'fizzbuzz');
			mkdirSync(join(addDir, 'files', 'src'), {recursive: true});
			mkdirSync(join(addDir, 'tests'), {recursive: true});
			mkdirSync(join(fizzbuzzDir, 'files', 'src'), {recursive: true});
			mkdirSync(join(fizzbuzzDir, 'tests'), {recursive: true});

			writeJson(join(addDir, 'problem.json'), {version: 1, description: 'add two values', timeout_ms: 5000});
			writeFileSync(join(addDir, 'files', 'src', 'sum.ts'), 'export const sum = (a: number, b: number): number => a + b;\n', 'utf8');
			writeFileSync(join(addDir, 'tests', 'sum.test.ts'), "import {expect, test} from 'vitest';\n", 'utf8');

			writeJson(join(fizzbuzzDir, 'problem.json'), {version: 1, description: 'fizzbuzz', timeout_ms: 7000});
			writeFileSync(join(fizzbuzzDir, 'files', 'src', 'fizzbuzz.ts'), 'export const fizzbuzz = (): string => "ok";\n', 'utf8');
			writeFileSync(join(fizzbuzzDir, 'tests', 'fizzbuzz.test.ts'), "import {expect, test} from 'vitest';\n", 'utf8');

			const loaded = loadProblems(root);
			expect(loaded.map((problem) => problem.name)).toEqual(['add', 'fizzbuzz']);
			expect(loaded.map((problem) => problem.category)).toEqual(['algorithms', 'logic']);
			if (!loaded[0]) {
				throw new TypeError('expected first problem');
			}
			if (!Array.isArray(loaded[0].tests)) {
				throw new TypeError('expected test files array');
			}
			if (!Array.isArray(loaded[0].files)) {
				throw new TypeError('expected source files array');
			}
			expect(loaded[0].files[0]).toMatchObject({path: 'src/sum.ts'});
			expect(loaded[0].tests[0]).toMatchObject({path: 'sum.test.ts'});
		} finally {
			rmSync(root, {recursive: true, force: true});
		}
	});

	test('throws when a problem has no category directory', () => {
		const root = createTempProblemsDir();

		try {
			const problemDir = join(root, 'no-category-problem');
			mkdirSync(join(problemDir, 'files'), {recursive: true});
			mkdirSync(join(problemDir, 'tests'), {recursive: true});
			writeJson(join(problemDir, 'problem.json'), {version: 1, description: 'bad', timeout_ms: 5000});

			expect(() => loadProblems(root)).toThrow('nested under a category');
		} finally {
			rmSync(root, {recursive: true, force: true});
		}
	});

	test('loads optional solution artifact from solution directory', () => {
		const root = createTempProblemsDir();

		try {
			const problemDir = join(root, 'logic', 'with-solution');
			mkdirSync(join(problemDir, 'files'), {recursive: true});
			mkdirSync(join(problemDir, 'tests'), {recursive: true});
			mkdirSync(join(problemDir, 'solution'), {recursive: true});
			writeJson(join(problemDir, 'problem.json'), {version: 1, description: 'desc', timeout_ms: 5000});
			writeFileSync(join(problemDir, 'files', 'index.ts'), 'export const value = 1;\n', 'utf8');
			writeFileSync(join(problemDir, 'tests', 'index.test.ts'), "import {expect, test} from 'vitest';\n", 'utf8');
			writeFileSync(join(problemDir, 'solution', 'index.ts'), 'export const value = 2;\n', 'utf8');

			const [loaded] = loadProblems(root);
			if (!loaded) {
				throw new TypeError('expected loaded problem');
			}
			expect(loaded.solution).toEqual({
				kind: 'changed-files-v1',
				files: [{path: 'index.ts', content: 'export const value = 2;\n'}],
			});
		} finally {
			rmSync(root, {recursive: true, force: true});
		}
	});
});

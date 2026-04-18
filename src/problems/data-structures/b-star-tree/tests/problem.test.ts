import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

type TreeApi = {
	insert: (key: number) => void;
	search: (key: number) => boolean;
	delete: (key: number) => void;
	keys: () => number[];
};

type AssertApi = {
	strictEqual: (actual: unknown, expected: unknown, message?: string | Error) => void;
	deepStrictEqual: (actual: unknown, expected: unknown, message?: string | Error) => void;
	notStrictEqual: (actual: unknown, expected: unknown, message?: string | Error) => void;
	match: (actual: string, expected: RegExp, message?: string | Error) => void;
	doesNotMatch: (actual: string, expected: RegExp, message?: string | Error) => void;
	ok: (value: unknown, message?: string | Error) => void;
	throws: (block: () => unknown, error?: unknown, message?: string | Error) => void;
	rejects: (block: (() => Promise<unknown>) | Promise<unknown>, error?: unknown, message?: string | Error) => Promise<void>;
	fail: (message?: string | Error) => never;
};

const ASSERT_API: AssertApi = {
	strictEqual: (actual, expected, message) => assert.strictEqual(actual, expected, message),
	deepStrictEqual: (actual, expected, message) => assert.deepStrictEqual(actual, expected, message),
	notStrictEqual: (actual, expected, message) => assert.notStrictEqual(actual, expected, message),
	match: (actual, expected, message) => assert.match(actual, expected, message),
	doesNotMatch: (actual, expected, message) => assert.doesNotMatch(actual, expected, message),
	ok: (value, message) => assert.ok(value, message),
	throws: (block, error, message) => {
		if (typeof error === 'undefined') {
			assert.throws(block);
			return;
		}

		if (typeof message === 'undefined') {
			assert.throws(block, error as RegExp | ((error: unknown) => boolean));
			return;
		}

		assert.throws(block, error as RegExp | ((error: unknown) => boolean), message);
	},
	rejects: async (block, error, message) => {
		if (typeof error === 'undefined') {
			await assert.rejects(block);
			return;
		}

		if (typeof message === 'undefined') {
			await assert.rejects(block, error as RegExp | ((error: unknown) => boolean));
			return;
		}

		await assert.rejects(block, error as RegExp | ((error: unknown) => boolean), message);
	},
	fail: (message) => assert.fail(message),
};

type ImplementLegacyContext = {
	assert: AssertApi;
	implementation: (...args: readonly unknown[]) => unknown;
	code: {result: string};
};

const ENTRY_NAME = "createBStarTree";
const runLegacyTests: (context: ImplementLegacyContext) => void | Promise<void> = ({assert, implementation}) => {
		const isTreeApi = (value: unknown): value is TreeApi => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}

			return (
				typeof Reflect.get(value, 'insert') === 'function' &&
				typeof Reflect.get(value, 'search') === 'function' &&
				typeof Reflect.get(value, 'delete') === 'function' &&
				typeof Reflect.get(value, 'keys') === 'function'
			);
		};

		const createTree = (degree: number): TreeApi => {
			const tree = implementation(degree);
			if (!isTreeApi(tree)) {
				throw new TypeError('expected createBStarTree to return tree API');
			}

			return tree;
		};

		{
			const tree = createTree(2);
			assert.strictEqual(tree.search(1), false);
			assert.deepStrictEqual(tree.keys(), []);
			for (const k of [10, 20, 5, 6, 12, 30, 7, 17]) {
				tree.insert(k);
			}
			assert.deepStrictEqual(tree.keys(), [5, 6, 7, 10, 12, 17, 20, 30]);
			tree.delete(6);
			assert.deepStrictEqual(tree.keys(), [5, 7, 10, 12, 17, 20, 30]);
			tree.delete(10);
			assert.deepStrictEqual(tree.keys(), [5, 7, 12, 17, 20, 30]);
		}

		{
			const tree = createTree(3);
			const input = [15, 10, 20, 5, 12, 17, 25, 3, 7, 11, 13, 16, 18, 22, 30];
			for (const k of input) {
				tree.insert(k);
			}
			assert.deepStrictEqual(
				tree.keys(),
				[...input].sort((a, b) => a - b),
			);
		}

		{
			const tree = createTree(2);
			for (let i = 1; i <= 50; i++) {
				tree.insert(i);
			}
			assert.deepStrictEqual(
				tree.keys(),
				Array.from({length: 50}, (_value, i) => i + 1),
			);
		}
	};

const loadExportedFunction = async (modulePath: string, entry: string): Promise<(...args: readonly unknown[]) => unknown> => {
	const moduleNamespace: unknown = await import(modulePath);
	if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
		throw new TypeError('Expected imported module to be an object');
	}

	const implementation = (moduleNamespace as Record<string, unknown>)[entry];
	if (typeof implementation !== 'function') {
		throw new TypeError('Expected entry function export to exist');
	}

	return implementation as (...args: readonly unknown[]) => unknown;
};

const resolveExistingFileUrl = (relativePaths: readonly string[]): URL => {
	for (const relativePath of relativePaths) {
		const candidate = new URL(relativePath, import.meta.url);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new TypeError(`Unable to resolve file from candidates: ${relativePaths.join(', ')}`);
};

describe('legacy migrated tests', () => {
	it('passes legacy assertions', async () => {
		const sourcePath = resolveExistingFileUrl(['./solution.ts', '../solution.ts', '../files/solution.ts']);
		const transformedSource = readFileSync(sourcePath, 'utf8');
		const implementation = await loadExportedFunction(sourcePath.href, ENTRY_NAME);
		await runLegacyTests({
			assert: ASSERT_API,
			implementation,
			code: {result: transformedSource},
		});
	});
});

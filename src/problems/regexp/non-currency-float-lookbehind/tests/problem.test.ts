import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

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

const ENTRY_NAME = "nonCurrencyFloatLookbehind";
const runLegacyTests: (context: ImplementLegacyContext) => void | Promise<void> = ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const a = regexp.exec('value is 3.14');
		assert.ok(a !== null);
		if (a === null) {
			return;
		}
		assert.strictEqual(a[0], '3.14');

		const b = regexp.exec('ratio: 0.5');
		assert.ok(b !== null);
		if (b === null) {
			return;
		}
		assert.strictEqual(b[0], '0.5');

		assert.strictEqual(regexp.exec('$3.14'), null);
		assert.strictEqual(regexp.exec('€9.99'), null);
		assert.ok(regexp.exec('£2.50') !== null);
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

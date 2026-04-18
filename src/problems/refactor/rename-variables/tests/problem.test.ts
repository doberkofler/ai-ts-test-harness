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

type RefactorLegacyContext = {
	assert: AssertApi;
	original: (...args: readonly unknown[]) => unknown;
	transformed: (...args: readonly unknown[]) => unknown;
	code: {input: string; result: string};
};

const ENTRY_NAME = "computeDiscount";
const runLegacyTests: (context: RefactorLegacyContext) => void | Promise<void> = ({assert, original, transformed, code}) => {
		assert.strictEqual(transformed(100, 10), original(100, 10));
		assert.strictEqual(transformed(49.99, 12.5), original(49.99, 12.5));
		assert.strictEqual(transformed(0, 75), original(0, 75));
		assert.doesNotMatch(code.result, /\btmp\b/, 'tmp must be renamed');
		assert.doesNotMatch(code.result, /\bres\b/, 'res must be renamed');
		assert.doesNotMatch(code.result, /\ba\b/, 'param a must be renamed');
		assert.doesNotMatch(code.result, /\bb\b/, 'param b must be renamed');
		assert.match(code.result, /function computeDiscount/, 'function name must be preserved');
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
		const originalPath = resolveExistingFileUrl(['./original.ts', '../original.ts', '../files/original.ts']);
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const originalSource = readFileSync(originalPath, 'utf8');
		const transformedSource = readFileSync(transformedPath, 'utf8');
		const original = await loadExportedFunction(originalPath.href, ENTRY_NAME);
		const transformed = await loadExportedFunction(transformedPath.href, ENTRY_NAME);
		await runLegacyTests({
			assert: ASSERT_API,
			original,
			transformed,
			code: {input: originalSource, result: transformedSource},
		});
	});
});

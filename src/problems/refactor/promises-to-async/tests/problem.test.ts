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

const ENTRY_NAME = "fetchUser";
const runLegacyTests: (context: RefactorLegacyContext) => void | Promise<void> = async ({assert, original, transformed, code}) => {
		const extractIdFromFetchInput = (input: Parameters<typeof fetch>[0]): string => {
			if (typeof input === 'string') {
				return input.split('/').at(-1) ?? '';
			}

			if (input instanceof URL) {
				return input.pathname.split('/').at(-1) ?? '';
			}

			return input.url.split('/').at(-1) ?? '';
		};

		const okFetch: typeof fetch = async (input) => {
			const payload = {id: extractIdFromFetchInput(input), source: 'ok'};
			const response = await Promise.resolve(Response.json(payload));
			return response;
		};

		const failingFetch: typeof fetch = async () => {
			await Promise.resolve();
			throw new Error('network down');
		};

		const originalFetch = globalThis.fetch;

		try {
			globalThis.fetch = okFetch;
			const originalOk = await original('42');
			const transformedOk = await transformed('42');
			assert.deepStrictEqual(transformedOk, originalOk);
			globalThis.fetch = failingFetch;
			await assert.rejects(async () => {
				await transformed('99');
			}, /fetch failed: Error: network down/);
		} finally {
			globalThis.fetch = originalFetch;
		}

		assert.doesNotMatch(code.result, /\.then\s*\(/, '.then chain must be removed');
		assert.doesNotMatch(code.result, /\.catch\s*\(/, '.catch chain must be removed');
		assert.match(code.result, /async\s+function\s+fetchUser/, 'function must be async');
		assert.match(code.result, /await\s+fetch\s*\(/, 'await fetch must exist');
		assert.match(code.result, /try\s*\{/, 'try block must exist');
		assert.match(code.result, /catch\s*\(/, 'catch block must exist');
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

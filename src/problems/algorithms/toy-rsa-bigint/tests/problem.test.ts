import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

type PublicKey = {n: bigint; e: bigint};

type PrivateKey = {n: bigint; d: bigint};

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

const ENTRY_NAME = "toyRsaBigint";
const runLegacyTests: (context: ImplementLegacyContext) => void | Promise<void> = ({assert, implementation, code}) => {
		const isResult = (value: unknown): value is {publicKey: PublicKey; privateKey: PrivateKey; cipher: bigint; decrypted: bigint} => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}
			if (!('publicKey' in value) || !('privateKey' in value) || !('cipher' in value) || !('decrypted' in value)) {
				return false;
			}

			const {publicKey, privateKey, cipher, decrypted} = value as {
				publicKey: unknown;
				privateKey: unknown;
				cipher: unknown;
				decrypted: unknown;
			};

			if (typeof publicKey !== 'object' || publicKey === null || typeof privateKey !== 'object' || privateKey === null) {
				return false;
			}

			return (
				'n' in publicKey &&
				'e' in publicKey &&
				'n' in privateKey &&
				'd' in privateKey &&
				typeof (publicKey as {n: unknown}).n === 'bigint' &&
				typeof (publicKey as {e: unknown}).e === 'bigint' &&
				typeof (privateKey as {n: unknown}).n === 'bigint' &&
				typeof (privateKey as {d: unknown}).d === 'bigint' &&
				typeof cipher === 'bigint' &&
				typeof decrypted === 'bigint'
			);
		};

		const result = implementation(61n, 53n, 17n, 65n);
		if (!isResult(result)) {
			throw new TypeError('toyRsaBigint must return key material and bigint cipher/decrypted values');
		}

		assert.strictEqual(result.publicKey.n, 3233n);
		assert.strictEqual(result.publicKey.e, 17n);
		assert.strictEqual(result.privateKey.n, 3233n);
		assert.strictEqual(result.privateKey.d, 2753n);
		assert.strictEqual(result.cipher, 2790n);
		assert.strictEqual(result.decrypted, 65n);

		const another = implementation(17n, 11n, 7n, 42n);
		if (!isResult(another)) {
			throw new TypeError('toyRsaBigint must return key material and bigint cipher/decrypted values');
		}
		assert.strictEqual(another.decrypted, 42n);
		assert.match(code.result, /bigint|\d+n|BigInt/, 'solution should use bigint arithmetic');
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

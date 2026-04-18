import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

type ListNode = {
	value: number;
	next: ListNode | null;
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

const ENTRY_NAME = "mergeSortLinkedList";
const runLegacyTests: (context: ImplementLegacyContext) => void | Promise<void> = ({assert, implementation, code}) => {
		const sort = (head: ListNode | null): unknown => implementation(head);

		const build = (values: readonly number[]): ListNode | null => {
			const nodes: ListNode[] = values.map((value) => ({value, next: null}));
			for (let i = 0; i < nodes.length - 1; i++) {
				const node = nodes[i];
				const next = nodes[i + 1];
				if (!node || !next) {
					continue;
				}
				node.next = next;
			}
			return nodes[0] ?? null;
		};

		const toArray = (head: unknown): number[] => {
			const output: number[] = [];
			let cursor: unknown = head;
			while (cursor !== null) {
				if (typeof cursor !== 'object') {
					throw new TypeError('expected linked-list node object');
				}

				const value: unknown = Reflect.get(cursor, 'value');
				if (typeof value !== 'number') {
					throw new TypeError('node.value must be a number');
				}
				output.push(value);

				const next: unknown = Reflect.get(cursor, 'next');
				if (next !== null && typeof next !== 'object') {
					throw new TypeError('node.next must be an object or null');
				}
				cursor = next;
			}
			return output;
		};

		assert.deepStrictEqual(toArray(sort(build([4, 2, 1, 3]))), [1, 2, 3, 4]);
		assert.deepStrictEqual(toArray(sort(build([-1, 5, 3, 4, 0]))), [-1, 0, 3, 4, 5]);
		assert.deepStrictEqual(toArray(sort(build([]))), []);
		assert.doesNotMatch(code.result, /\.sort\s*\(/, 'must not use Array.prototype.sort');
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

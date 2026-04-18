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

const ENTRY_NAME = "reverseLinkedListInPlace";
const runLegacyTests: (context: ImplementLegacyContext) => void | Promise<void> = ({assert, implementation}) => {
		const isListNode = (value: unknown): value is ListNode => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}
			if (!('value' in value) || !('next' in value)) {
				return false;
			}

			const maybeValue: unknown = (value as {value: unknown}).value;
			const maybeNext: unknown = (value as {next: unknown}).next;
			return typeof maybeValue === 'number' && (maybeNext === null || typeof maybeNext === 'object');
		};

		const reverse = (head: ListNode | null): ListNode | null => {
			const result = implementation(head);
			if (result === null) {
				return null;
			}
			if (!isListNode(result)) {
				throw new TypeError('reverseLinkedListInPlace must return a ListNode or null');
			}
			return result;
		};

		const build = (values: readonly number[]): {head: ListNode | null; nodes: ListNode[]} => {
			const nodes: ListNode[] = values.map((value) => ({value, next: null}));
			for (let i = 0; i < nodes.length - 1; i++) {
				const node = nodes[i];
				const next = nodes[i + 1];
				if (!node || !next) {
					continue;
				}
				node.next = next;
			}

			return {head: nodes[0] ?? null, nodes};
		};

		const toArray = (head: ListNode | null): number[] => {
			const output: number[] = [];
			let cursor = head;
			while (cursor !== null) {
				output.push(cursor.value);
				cursor = cursor.next;
			}
			return output;
		};

		const empty = reverse(null);
		assert.strictEqual(empty, null);

		{
			const {head, nodes} = build([1, 2, 3, 4]);
			const reversed = reverse(head);
			assert.deepStrictEqual(toArray(reversed), [4, 3, 2, 1]);
			assert.strictEqual(reversed, nodes[3]);
			if (!reversed) {
				throw new TypeError('expected reversed list head');
			}
			const second = reversed.next;
			if (!second) {
				throw new TypeError('expected second node');
			}
			const third = second.next;
			if (!third) {
				throw new TypeError('expected third node');
			}
			const fourth = third.next;
			if (!fourth) {
				throw new TypeError('expected fourth node');
			}

			assert.strictEqual(second, nodes[2]);
			assert.strictEqual(third, nodes[1]);
			assert.strictEqual(fourth, nodes[0]);
			assert.strictEqual(fourth.next, null);
		}

		{
			const {head, nodes} = build([42]);
			const reversed = reverse(head);
			assert.strictEqual(reversed, nodes[0]);
			assert.deepStrictEqual(toArray(reversed), [42]);
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

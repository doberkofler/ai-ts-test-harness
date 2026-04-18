import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

type AvlNode = {
	value: number;
	height: number;
	left: AvlNode | null;
	right: AvlNode | null;
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

const ENTRY_NAME = "avlTreeInsertRebalance";
const runLegacyTests: (context: ImplementLegacyContext) => void | Promise<void> = ({assert, implementation}) => {
		const isAvlNode = (value: unknown): value is AvlNode => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}
			if (!('value' in value) || !('height' in value) || !('left' in value) || !('right' in value)) {
				return false;
			}

			const {
				value: nodeValue,
				height: nodeHeight,
				left,
				right,
			} = value as {
				value: unknown;
				height: unknown;
				left: unknown;
				right: unknown;
			};
			return (
				typeof nodeValue === 'number' &&
				typeof nodeHeight === 'number' &&
				(left === null || typeof left === 'object') &&
				(right === null || typeof right === 'object')
			);
		};

		const build = (values: number[]): AvlNode | null => {
			const result = implementation(values);
			if (result === null) {
				return null;
			}
			if (!isAvlNode(result)) {
				throw new TypeError('avlTreeInsertRebalance must return an AVL node or null');
			}
			return result;
		};

		const inOrder = (node: AvlNode | null, output: number[]): void => {
			if (node === null) {
				return;
			}

			inOrder(node.left, output);
			output.push(node.value);
			inOrder(node.right, output);
		};

		const verify = (node: AvlNode | null): number => {
			if (node === null) {
				return 0;
			}

			const leftHeight = verify(node.left);
			const rightHeight = verify(node.right);
			assert.ok(Math.abs(leftHeight - rightHeight) <= 1, 'AVL balance factor must be within [-1, 1]');
			assert.strictEqual(node.height, Math.max(leftHeight, rightHeight) + 1, 'height field must be correct');
			return node.height;
		};

		assert.strictEqual(build([]), null);

		{
			const root = build([10, 20, 30, 40, 50, 25]);
			const output: number[] = [];
			inOrder(root, output);
			assert.deepStrictEqual(output, [10, 20, 25, 30, 40, 50]);
			verify(root);
		}

		{
			const root = build([7, 3, 9, 1, 5, 8, 10, 3, 9, 5]);
			const output: number[] = [];
			inOrder(root, output);
			assert.deepStrictEqual(output, [1, 3, 5, 7, 8, 9, 10]);
			verify(root);
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

import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

const resolveExistingFileUrl = (relativePaths: readonly string[]): URL => {
	for (const relativePath of relativePaths) {
		const candidate = new URL(relativePath, import.meta.url);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new TypeError(`Unable to resolve file from candidates: ${relativePaths.join(', ')}`);
};

const importJavaScriptModule = async (source: string): Promise<Record<string, unknown>> => {
	const hasExportedCalculator = /export\s+class\s+Calculator\b/u.test(source);
	const executableSource = hasExportedCalculator ? source : `${source}\nexport {Calculator};`;
	const dataUrl = `data:text/javascript;base64,${Buffer.from(executableSource, 'utf8').toString('base64')}`;
	const moduleNamespace: unknown = await import(dataUrl);
	if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
		throw new TypeError('Expected imported module namespace object');
	}

	return moduleNamespace as Record<string, unknown>;
};

describe('legacy migrated tests', () => {
	it('replaces decorator syntax with equivalent JavaScript method wrapping', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /@log/u);
		assert.doesNotMatch(transformedSource, /PropertyDescriptor/u);
		assert.doesNotMatch(transformedSource, /:\s*number\b/u);
		assert.doesNotMatch(transformedSource, /\bas\s+/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const Calculator = implementation.Calculator;
		if (typeof Calculator !== 'function') {
			throw new TypeError('Expected Calculator export to exist');
		}

		const messages: unknown[][] = [];
		const originalConsoleLog = console.log;
		console.log = (...args: unknown[]): void => {
			messages.push(args);
		};

		try {
			const calculator = new Calculator();
			assert.strictEqual(calculator.add(2, 3), 5);
		} finally {
			console.log = originalConsoleLog;
		}

		assert.strictEqual(messages.length, 2);
		assert.deepStrictEqual(messages[0], ['[add] called with', [2, 3]]);
		assert.deepStrictEqual(messages[1], ['[add] returned', 5]);
	});
});

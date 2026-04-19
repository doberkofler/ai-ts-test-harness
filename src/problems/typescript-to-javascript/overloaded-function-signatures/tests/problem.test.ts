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
	const dataUrl = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
	const moduleNamespace: unknown = await import(dataUrl);
	if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
		throw new TypeError('Expected imported module namespace object');
	}

	return moduleNamespace as Record<string, unknown>;
};

describe('legacy migrated tests', () => {
	it('collapses overloaded signatures into one valid JavaScript function', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		const formatDeclarationMatches = transformedSource.match(/export\s+function\s+format\s*\(/gu) ?? [];
		assert.strictEqual(formatDeclarationMatches.length, 1);
		assert.doesNotMatch(transformedSource, /:\s*number\b/u);
		assert.doesNotMatch(transformedSource, /:\s*Date\b/u);
		assert.doesNotMatch(transformedSource, /\|\s*Date\s*\|/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const format = implementation.format;
		if (typeof format !== 'function') {
			throw new TypeError('Expected format export to exist');
		}

		assert.strictEqual(format(12.3456), '12.35');
		assert.strictEqual(format(new Date('2024-03-05T12:34:56.000Z')), '2024-03-05');
		assert.deepStrictEqual(format([1, 2.345, 6]), ['1.00', '2.35', '6.00']);
	});
});

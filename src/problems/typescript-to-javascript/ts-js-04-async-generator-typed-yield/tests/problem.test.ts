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
	it('converts typed async generator to JavaScript and preserves yielded order', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /paginate\s*<\s*T/u);
		assert.doesNotMatch(transformedSource, /AsyncGenerator/u);
		assert.doesNotMatch(transformedSource, /:\s*\(page:\s*number/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const paginate = implementation.paginate;
		if (typeof paginate !== 'function') {
			throw new TypeError('Expected paginate export to exist');
		}

		const pagesCalled: number[] = [];
		const fetcher = async (page: number): Promise<{items: string[]; hasMore: boolean}> => {
			pagesCalled.push(page);
			if (page === 2) {
				return {items: ['c'], hasMore: false};
			}

			return {items: ['a', 'b'], hasMore: true};
		};

		const seen: string[] = [];
		for await (const item of paginate(fetcher, 1)) {
			seen.push(item as string);
		}

		assert.deepStrictEqual(seen, ['a', 'b', 'c']);
		assert.deepStrictEqual(pagesCalled, [1, 2]);
	});
});

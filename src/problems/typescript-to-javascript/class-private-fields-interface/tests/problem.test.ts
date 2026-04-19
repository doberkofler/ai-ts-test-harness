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
	it('removes interface and generic annotations and keeps LRU semantics', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /\binterface\s+Cache\b/u);
		assert.doesNotMatch(transformedSource, /\bimplements\b/u);
		assert.doesNotMatch(transformedSource, /class\s+LRUCache\s*<\s*K\s*,\s*V\s*>/u);
		assert.doesNotMatch(transformedSource, /readonly\s+#/u);
		assert.doesNotMatch(transformedSource, /\b!\s*[;.)\]]/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const LRUCache = implementation.LRUCache;
		if (typeof LRUCache !== 'function') {
			throw new TypeError('Expected LRUCache export to exist');
		}

		assert.throws(() => new LRUCache(0), /capacity must be > 0/u);

		const cache = new LRUCache(2);
		cache.set('a', 1);
		cache.set('b', 2);
		assert.strictEqual(cache.get('a'), 1);
		cache.set('c', 3);
		assert.strictEqual(cache.get('b'), undefined);
		assert.strictEqual(cache.get('a'), 1);
		assert.strictEqual(cache.get('c'), 3);
		assert.strictEqual(cache.size, 2);
		assert.strictEqual(cache.delete('a'), true);
		assert.strictEqual(cache.size, 1);
	});
});

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
	it('removes mapped/conditional type syntax and preserves null-stripping behavior', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /\btype\s+Nullable\b/u);
		assert.doesNotMatch(transformedSource, /\btype\s+NonNullableFields\b/u);
		assert.doesNotMatch(transformedSource, /stripNulls\s*<\s*T/u);
		assert.doesNotMatch(transformedSource, /\bas\s+/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const stripNulls = implementation.stripNulls;
		if (typeof stripNulls !== 'function') {
			throw new TypeError('Expected stripNulls export to exist');
		}

		assert.deepStrictEqual(stripNulls({id: 1, name: 'Ada', note: null}), {id: 1, name: 'Ada'});
		assert.deepStrictEqual(stripNulls({a: null, b: null}), {});
	});
});

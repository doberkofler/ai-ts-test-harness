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
	it('converts generic utility type-heavy source to runtime-equivalent JavaScript', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /\btype\s+DeepPartial\b/u);
		assert.doesNotMatch(transformedSource, /\btype\s+DeepReadonly\b/u);
		assert.doesNotMatch(transformedSource, /mergeDeep\s*<\s*T/u);
		assert.doesNotMatch(transformedSource, /\bas\s+/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const mergeDeep = implementation.mergeDeep;
		if (typeof mergeDeep !== 'function') {
			throw new TypeError('Expected mergeDeep export to exist');
		}

		const target = {count: 1, nested: {left: 1, right: 2}, tags: ['a', 'b']};
		const source = {nested: {right: 99}, tags: ['x'], count: undefined};
		const merged = mergeDeep(target, source);

		assert.deepStrictEqual(merged, {count: 1, nested: {left: 1, right: 99}, tags: ['x']});
		assert.deepStrictEqual(target, {count: 1, nested: {left: 1, right: 2}, tags: ['a', 'b']});
	});
});

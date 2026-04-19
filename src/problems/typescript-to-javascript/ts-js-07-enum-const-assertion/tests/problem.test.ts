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
	it('removes const assertion and type alias while preserving opposite lookup', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /\bas const\b/u);
		assert.doesNotMatch(transformedSource, /\btype\s+Direction\b/u);
		assert.doesNotMatch(transformedSource, /:\s*Direction\b/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const opposite = implementation.opposite;
		const Direction = implementation.Direction;
		if (typeof opposite !== 'function') {
			throw new TypeError('Expected opposite export to exist');
		}

		const enumObject =
			typeof Direction === 'object' && Direction !== null
				? (Direction as {Up: string; Down: string; Left: string; Right: string})
				: {Up: 'UP', Down: 'DOWN', Left: 'LEFT', Right: 'RIGHT'};

		assert.strictEqual(opposite(enumObject.Up), enumObject.Down);
		assert.strictEqual(opposite(enumObject.Down), enumObject.Up);
		assert.strictEqual(opposite(enumObject.Left), enumObject.Right);
		assert.strictEqual(opposite(enumObject.Right), enumObject.Left);
	});
});

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
	it('removes TypeScript-only discriminated union typing and preserves area behavior', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /\btype\s+Shape\b/u);
		assert.doesNotMatch(transformedSource, /:\s*Shape\b/u);
		assert.doesNotMatch(transformedSource, /:\s*number\b/u);
		assert.doesNotMatch(transformedSource, /\bnever\b/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const area = implementation.area;
		if (typeof area !== 'function') {
			throw new TypeError('Expected area export to exist');
		}

		assert.strictEqual(area({kind: 'circle', radius: 2}), Math.PI * 4);
		assert.strictEqual(area({kind: 'rectangle', width: 3, height: 4}), 12);
		assert.strictEqual(area({kind: 'triangle', base: 10, height: 6}), 30);
		assert.throws(() => area({kind: 'hexagon', side: 3}), /Unhandled shape/u);
	});
});

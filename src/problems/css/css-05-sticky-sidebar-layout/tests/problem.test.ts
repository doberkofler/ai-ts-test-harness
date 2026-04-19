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

describe('css-05-sticky-sidebar-layout', () => {
	it('defines sticky sidebar behavior and stacked mobile fallback', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /grid-template-columns\s*:\s*260px\s+minmax\(0,\s*1fr\)/i);
		assert.match(css, /aside|\.layout__sidebar/i);
		assert.match(css, /width\s*:\s*260px\s*;/i);
		assert.match(css, /position\s*:\s*sticky\s*;/i);
		assert.match(css, /top\s*:\s*1rem\s*;/i);
		assert.match(css, /overflow-y\s*:\s*auto\s*;/i);
		assert.match(css, /max-height\s*:\s*calc\(100vh\s*-\s*2rem\)\s*;/i);
		assert.match(css, /@media\s*\(max-width:\s*767px\)/i);
		assert.match(css, /position\s*:\s*static\s*;/i);
	});
});

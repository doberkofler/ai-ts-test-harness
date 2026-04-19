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

describe('css-04-card-component-hover-state', () => {
	it('implements structural sections, hover/focus effects, and skeleton shimmer', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /\.card\s*\{/i);
		assert.match(css, /\.card__image\s*\{[\s\S]*aspect-ratio\s*:\s*4\s*\/\s*3\s*;/i);
		assert.match(css, /\.card__image\s+img\s*\{[\s\S]*object-fit\s*:\s*cover\s*;/i);
		assert.match(css, /\.card__body\s*\{/i);
		assert.match(css, /\.card__footer\s*\{/i);
		assert.match(css, /:hover|:focus-within/i);
		assert.match(css, /translateY\(\s*-4px\s*\)/i);
		assert.match(css, /box-shadow\s*:/i);
		assert.match(css, /\.card__primary-link:focus-visible\s*\{[\s\S]*outline\s*:/i);
		assert.match(css, /@keyframes\s+shimmer/i);
		assert.match(css, /linear-gradient\(/i);
	});
});

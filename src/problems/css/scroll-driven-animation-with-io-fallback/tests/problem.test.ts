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

describe('scroll-driven-animation-with-io-fallback', () => {
	it('uses scroll-driven timeline with fallback and reduced-motion support', () => {
		const cssPath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const jsPath = resolveExistingFileUrl(['./fallback.js', '../fallback.js', '../files/fallback.js']);
		const css = readFileSync(cssPath, 'utf8');
		const js = readFileSync(jsPath, 'utf8');

		assert.match(css, /@keyframes/i);
		assert.match(css, /\.animate-on-scroll/i);
		assert.match(css, /opacity\s*:\s*0\s*;/i);
		assert.match(css, /translateY\(/i);
		assert.match(css, /animation-fill-mode\s*:\s*both\s*;/i);
		assert.match(css, /animation-timeline\s*:\s*view\(\)/i);
		assert.match(css, /@supports\s+not\s*\(animation-timeline:\s*view\(\)\)/i);
		assert.match(css, /\.is-visible/i);
		assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);

		assert.match(js, /IntersectionObserver/i);
		assert.match(js, /\.animate-on-scroll/i);
		assert.match(js, /is-visible/i);
	});
});

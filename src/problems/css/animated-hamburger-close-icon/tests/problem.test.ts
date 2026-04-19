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

describe('animated-hamburger-close-icon', () => {
	it('animates bars into close icon with reduced motion support', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /\.hamburger-btn\s*>\s*span/i);
		assert.match(css, /transition\s*:[^;]*transform/i);
		assert.match(css, /\[aria-expanded=['"]true['"]\]\s*>\s*span:nth-child\(1\)[\s\S]*rotate\(45deg\)/i);
		assert.match(css, /\[aria-expanded=['"]true['"]\]\s*>\s*span:nth-child\(2\)[\s\S]*opacity\s*:\s*0/i);
		assert.match(css, /\[aria-expanded=['"]true['"]\]\s*>\s*span:nth-child\(3\)[\s\S]*rotate\(-45deg\)/i);
		assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*transition\s*:\s*none/i);
	});
});

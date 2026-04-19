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

describe('css-09-print-stylesheet', () => {
	it('defines required print-only hiding, pagination, and metadata rules', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /@media\s+print/i);
		assert.match(css, /nav[\s\S]*\.sidebar[\s\S]*\.ads[\s\S]*footer[\s\S]*\.no-print/i);
		assert.match(css, /background\s*:\s*#?fff(?:fff)?\s*!important|background\s*:\s*white\s*!important/i);
		assert.match(css, /color\s*:\s*#?000(?:000)?\s*!important|color\s*:\s*black\s*!important/i);
		assert.match(css, /h1[\s\S]*break-before\s*:\s*page|h1[\s\S]*page-break-before\s*:\s*always/i);
		assert.match(css, /table[\s\S]*break-inside\s*:\s*avoid|table[\s\S]*page-break-inside\s*:\s*avoid/i);
		assert.match(css, /figure[\s\S]*break-inside\s*:\s*avoid|figure[\s\S]*page-break-inside\s*:\s*avoid/i);
		assert.match(css, /a\[href\]::after[\s\S]*attr\(href\)/i);
		assert.match(css, /abbr\[title\]::after[\s\S]*attr\(title\)/i);
		assert.match(css, /font-family\s*:\s*Georgia/i);
		assert.match(css, /font-size\s*:\s*12pt/i);
		assert.match(css, /line-height\s*:\s*1\.5/i);
	});
});

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

describe('css-only-accordion', () => {
	it('styles details/summary accordion with chevron and row animation', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /details/i);
		assert.match(css, /summary/i);
		assert.match(css, /grid-template-rows\s*:\s*0fr\s*;/i);
		assert.match(css, /details\[open\][\s\S]*grid-template-rows\s*:\s*1fr\s*;/i);
		assert.match(css, /summary::after[\s\S]*content\s*:/i);
		assert.match(css, /details\[open\]\s*>\s*summary::after[\s\S]*rotate\(180deg\)/i);
		assert.match(css, /name/i);
	});
});

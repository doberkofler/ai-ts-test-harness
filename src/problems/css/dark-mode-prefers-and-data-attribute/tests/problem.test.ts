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

describe('dark-mode-prefers-and-data-attribute', () => {
	it('declares required theme tokens and dark-mode overrides', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		for (const token of ['bg', 'surface', 'text-primary', 'text-secondary', 'accent', 'border']) {
			assert.match(css, new RegExp(`--color-${token}\\s*:`, 'i'));
		}

		assert.match(css, /@media\s*\(prefers-color-scheme:\s*dark\)/i);
		assert.match(css, /\[data-theme=['"]dark['"]\]/i);
		assert.match(css, /:root\s*\{[\s\S]*transition\s*:[^;]*background-color[^;]*color/i);
		assert.match(css, /\.theme-toggle::after\s*\{[\s\S]*content\s*:/i);
	});
});

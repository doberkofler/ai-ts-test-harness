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

describe('responsive-12-column-grid', () => {
	it('defines grid tokens, responsive columns, and span/offset utilities', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /--columns\s*:\s*12\s*;/i);
		assert.match(css, /--gap\s*:\s*1rem\s*;/i);
		assert.match(css, /--margin\s*:\s*2rem\s*;/i);
		assert.match(css, /\.container\s*\{[\s\S]*(?:max-width|width)\s*:\s*(?:min\(1280px|1280px)/i);
		assert.match(css, /\.container\s*\{[\s\S]*margin-inline\s*:\s*auto\s*;/i);

		for (let index = 1; index <= 12; index += 1) {
			assert.match(css, new RegExp(`\\.col-${index}\\s*\\{[^}]*grid-column\\s*:\\s*span\\s+${index}\\s*;`, 'i'));
		}

		for (let index = 1; index <= 11; index += 1) {
			const startColumn = index + 1;
			assert.match(css, new RegExp(`\\.offset-${index}\\s*\\{[^}]*grid-column-start\\s*:\\s*${startColumn}\\s*;`, 'i'));
		}

		assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*--current-columns\s*:\s*4\s*;/i);
		assert.match(css, /@media\s*\(min-width:\s*601px\)\s*and\s*\(max-width:\s*960px\)[\s\S]*--current-columns\s*:\s*8\s*;/i);
		assert.match(css, /@media\s*\(min-width:\s*961px\)[\s\S]*--current-columns\s*:\s*12\s*;/i);
	});
});

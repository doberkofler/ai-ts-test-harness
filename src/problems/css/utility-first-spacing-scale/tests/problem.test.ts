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

const SCALE = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16] as const;

describe('utility-first-spacing-scale', () => {
	it('defines base spacing token and margin/padding utility families', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /--spacing\s*:\s*0\.25rem\s*;/i);

		for (const value of SCALE) {
			assert.match(css, new RegExp(`\\.m-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.mx-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.my-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.mt-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.mr-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.mb-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.ml-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.p-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.px-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.py-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.pt-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.pr-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.pb-${value}\\s*\\{`, 'i'));
			assert.match(css, new RegExp(`\\.pl-${value}\\s*\\{`, 'i'));
		}
	});
});

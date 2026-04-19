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

const STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'] as const;

describe('fluid-typography-scale', () => {
	it('defines seven fluid text tokens and matching utility classes', () => {
		const sourcePath = resolveExistingFileUrl(['./solution.css', '../solution.css', '../files/solution.css']);
		const css = readFileSync(sourcePath, 'utf8');

		assert.match(css, /320px|20rem/i);
		assert.match(css, /1440px|90rem/i);

		for (const step of STEPS) {
			assert.match(css, new RegExp(`--text-${step}\\s*:\\s*clamp\\(`, 'i'));
			assert.match(css, new RegExp(`--text-${step}[\\s\\S]*100vw`, 'i'));
			assert.match(css, new RegExp(`\\.text-${step}\\s*\\{[^}]*font-size\\s*:\\s*var\\(--text-${step}\\)\\s*;`, 'i'));
		}
	});
});

import {describe, expect, it} from 'vitest';
import {html09SemanticPageSkeleton} from './solution.ts';

describe('semantic-page-skeleton', () => {
	it('returns a semantically structured full HTML document', () => {
		const html = html09SemanticPageSkeleton();

		expect(html).toMatch(/<!DOCTYPE html>/i);
		expect(html).toMatch(/<html[^>]*lang="[^"]+"[^>]*>/i);
		expect(html).toMatch(/<meta[^>]*charset=/i);
		expect(html).toMatch(/<meta[^>]*name="viewport"[^>]*>/i);
		expect(html).toMatch(/<body>[\s\S]*<a[^>]*href="#main-content"[^>]*>[\s\S]*<\/a>/i);
		expect(html).toMatch(/<header>[\s\S]*<nav[\s\S]*<\/nav>[\s\S]*<\/header>/i);
		expect(html).toMatch(/<main[^>]*id="main-content"[^>]*>[\s\S]*<article>[\s\S]*<\/article>[\s\S]*<aside>[\s\S]*<\/aside>[\s\S]*<\/main>/i);
		expect(html).toMatch(/<footer>[\s\S]*<nav[\s\S]*<\/nav>[\s\S]*copyright|&copy;/i);
		const h1Matches = html.match(/<h1\b/gi) ?? [];
		expect(h1Matches).toHaveLength(1);
		expect(html).toMatch(/<h2\b/i);
		expect(html).toMatch(/<h3\b/i);
		expect(html).not.toMatch(/<div\b/i);
	});
});

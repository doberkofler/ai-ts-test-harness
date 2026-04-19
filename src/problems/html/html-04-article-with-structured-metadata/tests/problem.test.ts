import {describe, expect, it} from 'vitest';
import {html04ArticleWithStructuredMetadata} from './solution.ts';

describe('html-04-article-with-structured-metadata', () => {
	it('returns article markup with required metadata blocks', () => {
		const html = html04ArticleWithStructuredMetadata();

		expect(html).toMatch(/<article[\s\S]*<header>[\s\S]*<\/header>[\s\S]*<footer>[\s\S]*<\/footer>[\s\S]*<\/article>/i);
		expect(html).toMatch(/<time[^>]*datetime="2024-11-15"[^>]*>/i);
		expect(html).toMatch(/<address>[\s\S]*<\/address>/i);
		expect(html).toMatch(/<figure>[\s\S]*<img[^>]*src="[^"]+"[^>]*>[\s\S]*<figcaption>[\s\S]*<\/figcaption>[\s\S]*<\/figure>/i);
		expect(html).toMatch(/<meta[^>]*property="og:title"[^>]*>/i);
		expect(html).toMatch(/<meta[^>]*property="og:description"[^>]*>/i);
		expect(html).toMatch(/<meta[^>]*property="og:image"[^>]*>/i);
		expect(html).toMatch(/<meta[^>]*property="og:type"[^>]*>/i);
		expect(html).toMatch(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*"@type"\s*:\s*"Article"[\s\S]*<\/script>/i);
	});
});

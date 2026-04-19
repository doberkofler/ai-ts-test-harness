import {describe, expect, it} from 'vitest';
import {html05ResponsiveImageSet} from './solution.ts';

describe('responsive-image-set', () => {
	it('returns picture markup with responsive sources and stable image dimensions', () => {
		const html = html05ResponsiveImageSet();

		expect(html).toMatch(/<picture>[\s\S]*<\/picture>/i);
		expect(html).toMatch(/<source[^>]*type="image\/webp"[^>]*srcset="[^"]*400w[^"]*800w[^"]*1200w[^"]*"[^>]*>/i);
		expect(html).toMatch(/<img[^>]*srcset="[^"]*400w[^"]*800w[^"]*1200w[^"]*"[^>]*sizes="[^"]+"[^>]*>/i);
		expect(html).toMatch(/<img[^>]*alt="([^"]+)"[^>]*>/i);
		const alt = html.match(/<img[^>]*alt="([^"]+)"[^>]*>/i)?.[1] ?? '';
		expect(alt.length).toBeGreaterThan(0);
		expect(alt.toLowerCase()).not.toContain('image of');
		expect(html).toMatch(/<img[^>]*loading="lazy"[^>]*decoding="async"[^>]*>/i);
		expect(html).toMatch(/<img[^>]*width="\d+"[^>]*height="\d+"[^>]*>/i);
	});
});

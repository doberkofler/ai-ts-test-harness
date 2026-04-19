import {describe, expect, it} from 'vitest';
import {html07DefinitionListGlossary} from './solution.ts';

describe('html-07-definition-list-glossary', () => {
	it('returns a glossary section with deep links and dt/dd pairs', () => {
		const html = html07DefinitionListGlossary();

		expect(html).toMatch(/<section[\s\S]*<h2[\s\S]*<\/h2>[\s\S]*<\/section>/i);
		expect(html).toMatch(/<nav[\s\S]*<ul[\s\S]*<a href="#term-api"[\s\S]*<a href="#term-dom"[\s\S]*<a href="#term-lcp"[\s\S]*<a href="#term-a11y"[\s\S]*<a href="#term-ssr"[\s\S]*<\/ul>[\s\S]*<\/nav>/i);
		expect(html).toMatch(/<dl>[\s\S]*<\/dl>/i);
		const dtMatches = html.match(/<dt\s+id="[^"]+"[^>]*>/gi) ?? [];
		const ddMatches = html.match(/<dd[^>]*>/gi) ?? [];
		expect(dtMatches).toHaveLength(5);
		expect(ddMatches).toHaveLength(5);
		expect(html).toMatch(/<abbr\s+title="[^"]+">API<\/abbr>/i);
		expect(html).toMatch(/<abbr\s+title="[^"]+">DOM<\/abbr>/i);
	});
});

import {describe, expect, it} from 'vitest';
import {html01AccessibleDataTable} from './solution.ts';

describe('accessible-data-table', () => {
	it('returns an accessible table with required structure and data', () => {
		const html = html01AccessibleDataTable();

		expect(html).toMatch(/<table[^>]*aria-label="[^"]+"[^>]*>/i);
		expect(html).toMatch(/<caption>[^<]*quarterly revenue by region[^<]*<\/caption>/i);
		expect(html).toMatch(/<thead>[\s\S]*<\/thead>/i);
		expect(html).toMatch(/<tbody>[\s\S]*<\/tbody>/i);
		expect(html).toMatch(/<tfoot>[\s\S]*<\/tfoot>/i);
		expect(html).toMatch(/<th[^>]*scope="col"[^>]*>Region<\/th>/i);
		expect(html).toMatch(/<th[^>]*scope="col"[^>]*>Q1<\/th>/i);
		expect(html).toMatch(/<th[^>]*scope="col"[^>]*>Q2<\/th>/i);
		expect(html).toMatch(/<th[^>]*scope="col"[^>]*>Q3<\/th>/i);
		expect(html).toMatch(/<th[^>]*scope="col"[^>]*>Q4<\/th>/i);
		expect(html).toMatch(/<th[^>]*scope="row"[^>]*>North<\/th>/i);
		expect(html).toMatch(/<th[^>]*scope="row"[^>]*>South<\/th>/i);
		expect(html).toMatch(/<th[^>]*scope="row"[^>]*>East<\/th>/i);
		expect(html).toMatch(/<tfoot>[\s\S]*<th[^>]*scope="row"[^>]*>Total<\/th>[\s\S]*29,?500[\s\S]*35,?500[\s\S]*34,?100[\s\S]*43,?100[\s\S]*<\/tfoot>/i);
		expect(html).not.toMatch(/\sstyle\s*=/i);
	});
});

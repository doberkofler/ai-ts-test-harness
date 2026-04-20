import {describe, expect, it} from 'vitest';
import {html10SearchFormWithAutocomplete} from './solution.ts';

describe('search-form-with-autocomplete', () => {
	it('returns combobox markup with ARIA autocomplete and keyboard hooks', () => {
		const html = html10SearchFormWithAutocomplete();

		expect(html).toMatch(/role="combobox"/i);
		expect(html).toMatch(/<input[^>]*aria-autocomplete="list"[^>]*aria-controls="[^"]+"[^>]*aria-expanded="[^"]+"[^>]*aria-activedescendant="[^"]*"[^>]*>/i);
		expect(html).toMatch(/<ul[^>]*id="[^"]+"[^>]*role="listbox"[^>]*>/i);
		expect(html).toMatch(/role="option"/i);
		expect(html).toMatch(/aria-live="polite"/i);
		expect(html).toMatch(/setAttribute\('aria-activedescendant'/);
		expect(html).toMatch(/ArrowDown|ArrowUp/);
	});
});

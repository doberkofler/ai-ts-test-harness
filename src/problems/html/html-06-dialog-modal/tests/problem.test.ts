import {describe, expect, it} from 'vitest';
import {html06DialogModal} from './solution.ts';

describe('html-06-dialog-modal', () => {
	it('returns an accessible dialog with required wiring hooks', () => {
		const html = html06DialogModal();

		expect(html).toMatch(/<dialog[^>]*aria-labelledby="dialog-title"[^>]*aria-describedby="dialog-description"[^>]*>/i);
		expect(html).toMatch(/<h2[^>]*id="dialog-title"[^>]*>/i);
		expect(html).toMatch(/<p[^>]*id="dialog-description"[^>]*>/i);
		expect(html).toMatch(/<button[^>]*aria-label="Close dialog"[^>]*>/i);
		expect(html).toMatch(/showModal\(/);
		expect(html).toMatch(/event\.key\s*!==?\s*'Tab'|event\.key\s*===\s*'Tab'/);
		expect(html).toMatch(/event\.preventDefault\(\)/);
		expect(html).toMatch(/first\?\.focus\(\)|focusable\[0\]\?\.focus\(\)/);
		expect(html).toMatch(/event\.key\s*===\s*'Escape'/);
		expect(html).toMatch(/dialog\.close\(\)/);
		expect(html).toMatch(/event\.target\s*===\s*dialog/);
	});
});

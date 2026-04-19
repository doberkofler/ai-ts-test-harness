import {describe, expect, it} from 'vitest';
import {html03NavigationWithDropdownMenus} from './solution.ts';

describe('html-03-navigation-with-dropdown-menus', () => {
	it('returns semantic nav with dropdowns and keyboard pattern markers', () => {
		const html = html03NavigationWithDropdownMenus();

		expect(html).toMatch(/<nav[^>]*aria-label="Main navigation"[^>]*>/i);
		expect(html).toMatch(/<li>[\s\S]*<button[^>]*aria-haspopup="true"[^>]*aria-expanded="false"[^>]*>[\s\S]*<\/button>[\s\S]*<ul[\s\S]*<\/ul>[\s\S]*<\/li>/i);
		expect(html).toMatch(/role="menuitem"/i);
		expect(html).toMatch(/tabindex="-1"/i);
		expect(html).toMatch(/ArrowRight|ArrowLeft|ArrowDown|ArrowUp/);
	});
});

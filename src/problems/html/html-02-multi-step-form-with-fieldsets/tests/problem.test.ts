import {describe, expect, it} from 'vitest';
import {html02MultiStepCheckoutForm} from './solution.ts';

describe('html-02-multi-step-form-with-fieldsets', () => {
	it('returns a 3-step checkout form with accessible fieldsets and progress', () => {
		const html = html02MultiStepCheckoutForm();

		expect(html).toMatch(/<ol[^>]*>[\s\S]*<li[^>]*aria-current="step"[^>]*>[\s\S]*<\/li>[\s\S]*<\/ol>/i);
		expect(html).toMatch(/<fieldset[^>]*>[\s\S]*<legend>\s*Shipping\s*<\/legend>/i);
		expect(html).toMatch(/<fieldset[^>]*hidden[^>]*>[\s\S]*<legend>\s*Payment\s*<\/legend>/i);
		expect(html).toMatch(/<fieldset[^>]*hidden[^>]*>[\s\S]*<legend>\s*Review\s*<\/legend>/i);
		expect(html).toMatch(/<label[^>]*for="shipping-name"[^>]*>/i);
		expect(html).toMatch(/<input[^>]*id="shipping-name"[^>]*required[^>]*aria-required="true"[^>]*>/i);
		expect(html).toMatch(/<label[^>]*for="card-number"[^>]*>/i);
		expect(html).toMatch(/<input[^>]*id="card-number"[^>]*required[^>]*aria-required="true"[^>]*>/i);
		expect(html).toMatch(/<label[^>]*for="review-terms"[^>]*>/i);
		expect(html).toMatch(/<input[^>]*id="review-terms"[^>]*required[^>]*aria-required="true"[^>]*>/i);
		expect(html).not.toMatch(/<input[^>]*placeholder=/i);
	});
});

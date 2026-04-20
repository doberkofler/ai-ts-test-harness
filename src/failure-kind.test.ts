import {describe, expect, test} from 'vitest';
import {inferFailureKindFromErrorText, isConnectivityErrorText} from './failure-kind.ts';

describe('failure-kind', () => {
	test('classifies html 403 challenge as runtime connectivity error', () => {
		const error = '403 <html><body>window._cf_chl_opt ... challenge-platform ...</body></html>';
		expect(isConnectivityErrorText(error)).toBe(true);
		expect(inferFailureKindFromErrorText(error)).toBe('runtime');
	});

	test('does not classify arbitrary javascript inequality as assertion', () => {
		const error = "window._cf_chl_opt.cOgUHash = location.hash === '' && location.href.indexOf('#') !== -1 ? '#' : location.hash";
		expect(inferFailureKindFromErrorText(error)).toBe('other');
	});
});

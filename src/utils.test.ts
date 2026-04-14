import {describe, expect, test} from 'vitest';
import {formatMs} from './utils.ts';

describe('formatMs', () => {
	test('uses milliseconds for short durations', () => {
		expect(formatMs(0)).toBe('0ms');
		expect(formatMs(999)).toBe('999ms');
	});

	test('uses rounded seconds for second-scale durations', () => {
		expect(formatMs(1000)).toBe('1s');
		expect(formatMs(1499)).toBe('1s');
		expect(formatMs(1500)).toBe('2s');
		expect(formatMs(59_999)).toBe('60s');
	});

	test('uses rounded minutes for minute-scale durations', () => {
		expect(formatMs(60_000)).toBe('1m');
		expect(formatMs(89_999)).toBe('1m');
		expect(formatMs(90_000)).toBe('2m');
		expect(formatMs(3_599_999)).toBe('60m');
	});

	test('uses rounded hours for hour-scale durations', () => {
		expect(formatMs(3_600_000)).toBe('1h');
		expect(formatMs(5_399_999)).toBe('1h');
		expect(formatMs(5_400_000)).toBe('2h');
	});
});

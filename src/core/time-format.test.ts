import {describe, expect, test} from 'vitest';
import {formatClockTime, formatElapsedClock} from './time-format.ts';

describe('formatClockTime', () => {
	test('formats a date to hh:mm:ss', () => {
		const date = new Date(2000, 0, 1, 3, 4, 5);
		expect(formatClockTime(date)).toBe('03:04:05');
	});
});

describe('formatElapsedClock', () => {
	test('formats zero duration', () => {
		expect(formatElapsedClock(0)).toBe('00:00:00');
	});

	test('clamps negative durations to zero', () => {
		expect(formatElapsedClock(-1200)).toBe('00:00:00');
	});

	test('formats elapsed durations with hours', () => {
		expect(formatElapsedClock(3_661_000)).toBe('01:01:01');
	});
});

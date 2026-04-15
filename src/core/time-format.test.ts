import {describe, expect, test} from 'vitest';
import {formatClockTime, formatElapsedClock, formatMs} from './time-format.ts';

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

describe('formatMs', () => {
	test('uses milliseconds for short durations', () => {
		expect(formatMs(0)).toBe('0ms');
		expect(formatMs(999)).toBe('999ms');
	});

	test('uses timer style for live progress durations', () => {
		expect(formatMs(420, {style: 'timer'})).toBe('0s');
		expect(formatMs(4200, {style: 'timer'})).toBe('4s');
		expect(formatMs(60_000, {style: 'timer'})).toBe('1m');
		expect(formatMs(61_000, {style: 'timer'})).toBe('1m 1s');
		expect(formatMs(3_600_000, {style: 'timer'})).toBe('1h');
		expect(formatMs(3_661_000, {style: 'timer'})).toBe('1h 1m 1s');
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

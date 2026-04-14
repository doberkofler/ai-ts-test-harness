import {describe, expect, test} from 'vitest';
import {
	formatCompletedProblemLine,
	formatCooldownLiveLine,
	formatCooldownStaticLine,
	formatProblemStartLine,
	formatRunFooterLines,
	formatRunningLiveLine,
} from './run-progress.ts';

describe('run progress formatting', () => {
	test('formats problem start and live lines', () => {
		expect(formatProblemStartLine(0, 3, 'sum')).toContain('[ 1/3] sum');
		expect(formatRunningLiveLine('sum', 4200)).toContain('Running sum 00:00:04');
		expect(formatCooldownLiveLine(3000)).toBe('Cooldown 00:00:03');
		expect(formatCooldownStaticLine(2000)).toBe('Cooldown 00:00:02');
	});

	test('formats completed lines for unicode and ascii modes', () => {
		const passLine = formatCompletedProblemLine({
			index: 0,
			total: 2,
			name: 'sum',
			passed: true,
			durationMs: 4,
			preferUnicode: true,
		});

		const failLine = formatCompletedProblemLine({
			index: 1,
			total: 2,
			name: 'fizzbuzz',
			passed: false,
			durationMs: 12,
			preferUnicode: false,
		});

		expect(passLine).toContain('✓ [ 1/2] sum (4ms)');
		expect(failLine).toContain('FAIL [ 2/2] fizzbuzz (12ms)');
	});

	test('formats footer summary lines', () => {
		const lines = formatRunFooterLines(
			[{passed: true}, {passed: false}],
			new Date('2026-01-01T09:31:40.000Z').getTime(),
			new Date('2026-01-01T09:31:40.520Z').getTime(),
		);

		expect(lines).toContain('Run Summary');
		expect(lines).toContain('Problems   : 2');
		expect(lines).toContain('Passed     : 1');
		expect(lines).toContain('Failed     : 1');
		expect(lines).toContain('Duration   : 520ms');
	});
});

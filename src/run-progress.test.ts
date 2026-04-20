import {describe, expect, test} from 'vitest';
import {
	formatCompletedProblemLine,
	formatCooldownLiveLine,
	formatCooldownStaticLine,
	formatProblemDisplayName,
	formatProblemStartLine,
	formatRunFooterLines,
	formatRunningLiveLine,
} from './run-progress.ts';

describe('run progress formatting', () => {
	test('formats problem start and live lines', () => {
		expect(formatProblemStartLine(0, 3, 'sum')).toContain('[ 1/3] sum');
		expect(formatProblemDisplayName('regexp', 'credit-card-redaction-match')).toBe('regexp/credit-card-redaction-match');
		expect(formatRunningLiveLine('sum', 4200)).toContain('Running sum 4s');
		expect(formatRunningLiveLine('sum', 4200, 'thinking')).toContain('Thinking sum 4s');
		expect(formatRunningLiveLine('sum', 4200, 'testing')).toContain('Testing sum 4s');
		expect(formatRunningLiveLine('sum', 4200, 'testing', {promptChars: 1500, responseChars: 84})).not.toContain('tok/s');
		expect(formatRunningLiveLine('sum', 4200, 'running', {promptChars: 1500, responseChars: 84})).toContain('↑375t ↓21t ~5 tok/s');
		expect(formatRunningLiveLine('sum', 4200, 'running', {promptChars: 1500, responseChars: 84}, 61_000)).toContain('ETA 1m 1s');
		expect(formatRunningLiveLine('sum', 61_000)).toContain('Running sum 1m 1s');
		expect(formatCooldownLiveLine(60, 50)).toBe('Cooldown: 60°C / 50°C');
		expect(formatCooldownLiveLine(42.6, 40)).toBe('Cooldown: 43°C / 40°C');
		expect(formatCooldownStaticLine(60, 50)).toBe('Cooldown: 60°C / 50°C');
		expect(formatCooldownStaticLine(42.4, 40)).toBe('Cooldown: 42°C / 40°C');
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

		const passWithDetailsLine = formatCompletedProblemLine({
			index: 0,
			total: 1,
			name: 'sum',
			passed: true,
			durationMs: 1500,
			preferUnicode: true,
			detail: '↓120t ~80 tok/s',
		});
		expect(passWithDetailsLine).toContain('↓120t ~80 tok/s');
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

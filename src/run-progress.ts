import {summarizeResults} from './core/results-summary.ts';
import {formatClockTime, formatElapsedClock} from './core/time-format.ts';
import {formatMs, STYLES, styleText} from './utils.ts';

type CompletedProblemLineInput = {
	index: number;
	total: number;
	name: string;
	passed: boolean;
	durationMs: number;
	preferUnicode: boolean;
};

const formatStep = (index: number, total: number): string => `[${String(index + 1).padStart(2, ' ')}/${total}]`;

export const formatProblemStartLine = (index: number, total: number, name: string): string =>
	`${styleText(formatStep(index, total), STYLES.dim)} ${styleText(name, STYLES.bold)}`;

export const formatRunningLiveLine = (name: string, elapsedMs: number): string =>
	`Running ${styleText(name, STYLES.bold)} ${styleText(formatElapsedClock(elapsedMs), STYLES.dim)}`;

export const formatCooldownLiveLine = (remainingMs: number): string => `Cooldown ${styleText(formatElapsedClock(remainingMs), STYLES.dim)}`;

export const formatCooldownStaticLine = (durationMs: number): string => `Cooldown ${formatElapsedClock(durationMs)}`;

export const formatCompletedProblemLine = (input: CompletedProblemLineInput): string => {
	const statusSymbol = input.preferUnicode ? (input.passed ? '✓' : '✗') : input.passed ? 'PASS' : 'FAIL';
	const statusStyle = input.passed ? STYLES.green : STYLES.red;
	return `${styleText(statusSymbol, statusStyle)} ${styleText(formatStep(input.index, input.total), STYLES.dim)} ${styleText(input.name, STYLES.bold)} ${styleText(`(${formatMs(input.durationMs)})`, STYLES.dim)}`;
};

export const formatRunFooterLines = (results: readonly {passed: boolean}[], startedAtMs: number, endedAtMs: number): string[] => {
	const summary = summarizeResults(results);
	return [
		styleText('Run Summary', STYLES.bold),
		`Problems   : ${summary.total}`,
		`Passed     : ${styleText(String(summary.passed), STYLES.green)}`,
		`Failed     : ${summary.failed > 0 ? styleText(String(summary.failed), STYLES.red) : summary.failed}`,
		`Start at   : ${formatClockTime(new Date(startedAtMs))}`,
		`Duration   : ${formatMs(Math.max(0, endedAtMs - startedAtMs))}`,
	];
};

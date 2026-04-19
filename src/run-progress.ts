import {summarizeResults} from './core/results-summary.ts';
import {formatMs, formatClockTime} from './core/time-format.ts';
import {RUN_PHASE_LABELS, type RunPhase} from './run-phase.ts';
import {type RunTransferStats} from './run-transfer.ts';
import {STYLES, styleText} from './utils.ts';

type CompletedProblemLineInput = {
	index: number;
	total: number;
	name: string;
	passed: boolean;
	durationMs: number;
	preferUnicode: boolean;
	detail?: string;
};

const formatStep = (index: number, total: number): string => `[${String(index + 1).padStart(2, ' ')}/${total}]`;

export const formatProblemDisplayName = (category: string, name: string): string => `${category}/${name}`;

const formatCompactCount = (value: number): string => {
	if (value >= 1e6) {
		const millions = value / 1e6;
		const rounded = Math.round(millions * 10) / 10;
		return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}m`;
	}

	if (value >= 1e3) {
		const thousands = value / 1e3;
		const rounded = Math.round(thousands * 10) / 10;
		return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}k`;
	}

	return String(Math.max(0, value));
};

const CHARS_PER_TOKEN_ESTIMATE = 4;

const estimateTokensFromChars = (chars: number): number => Math.max(0, Math.round(chars / CHARS_PER_TOKEN_ESTIMATE));

const formatEstimatedTokensPerSecond = (responseChars: number, elapsedMs: number): string => {
	if (elapsedMs <= 0) {
		return '0 tok/s';
	}

	const tokensPerSecond = Math.round((estimateTokensFromChars(responseChars) * 1e3) / elapsedMs);
	return `${formatCompactCount(tokensPerSecond)} tok/s`;
};

export const formatEstimatedTransferSummary = (transferStats: RunTransferStats, elapsedMs: number): string => {
	const promptTokens = estimateTokensFromChars(transferStats.promptChars);
	const responseTokens = estimateTokensFromChars(transferStats.responseChars);
	return `↑${formatCompactCount(promptTokens)}t ↓${formatCompactCount(responseTokens)}t ~${formatEstimatedTokensPerSecond(transferStats.responseChars, elapsedMs)}`;
};

export const formatProblemStartLine = (index: number, total: number, name: string): string =>
	`${styleText(formatStep(index, total), STYLES.dim)} ${styleText(name, STYLES.bold)}`;

export const formatRunningLiveLine = (
	name: string,
	elapsedMs: number,
	phase: RunPhase = 'running',
	transferStats?: RunTransferStats,
	etaMs?: number,
): string => {
	const elapsedLabel = styleText(formatMs(elapsedMs, {style: 'timer'}), STYLES.dim);
	const etaLabel = typeof etaMs === 'number' && Number.isFinite(etaMs) ? styleText(`ETA ${formatMs(Math.max(0, etaMs), {style: 'timer'})}`, STYLES.dim) : '';
	if (typeof transferStats === 'undefined') {
		return `${RUN_PHASE_LABELS[phase]} ${styleText(name, STYLES.bold)} ${elapsedLabel}${etaLabel.length > 0 ? ` ${etaLabel}` : ''}`;
	}

	const transferLabel = styleText(formatEstimatedTransferSummary(transferStats, elapsedMs), STYLES.dim);

	return `${RUN_PHASE_LABELS[phase]} ${styleText(name, STYLES.bold)} ${elapsedLabel} ${transferLabel}${etaLabel.length > 0 ? ` ${etaLabel}` : ''}`;
};

export const formatCooldownLiveLine = (remainingMs: number): string => `Cooldown ${styleText(formatMs(remainingMs, {style: 'timer'}), STYLES.dim)}`;

export const formatCooldownStaticLine = (durationMs: number): string => `Cooldown ${formatMs(durationMs, {style: 'timer'})}`;

export const formatCompletedProblemLine = (input: CompletedProblemLineInput): string => {
	const statusSymbol = input.preferUnicode ? (input.passed ? '✓' : '✗') : input.passed ? 'PASS' : 'FAIL';
	const statusStyle = input.passed ? STYLES.green : STYLES.red;
	const detailLabel = typeof input.detail === 'string' && input.detail.length > 0 ? ` ${styleText(input.detail, STYLES.dim)}` : '';
	return `${styleText(statusSymbol, statusStyle)} ${styleText(formatStep(input.index, input.total), STYLES.dim)} ${styleText(input.name, STYLES.bold)} ${styleText(`(${formatMs(input.durationMs)})`, STYLES.dim)}${detailLabel}`;
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

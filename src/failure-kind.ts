import {type FailureKind} from './types.ts';

const normalize = (value: string | undefined): string => (typeof value === 'string' ? value.toLowerCase() : '');

export const isTimeoutErrorText = (error: string | undefined): boolean => {
	const normalized = normalize(error);
	if (normalized.length === 0) {
		return false;
	}

	return normalized.includes('timed out') || normalized.includes('timeout') || normalized.includes('abort');
};

const isAssertionErrorText = (error: string | undefined): boolean => {
	const normalized = normalize(error);
	if (normalized.length === 0) {
		return false;
	}

	return (
		normalized.includes('assertionerror') ||
		normalized.includes('err_assertion') ||
		normalized.includes('expected values to be') ||
		normalized.includes('did not match the regular expression')
	);
};

export const isConnectivityErrorText = (error: string | undefined): boolean => {
	const normalized = normalize(error);
	if (normalized.length === 0) {
		return false;
	}

	if (/^\d{3}\s*<html/i.test(normalized)) {
		return true;
	}

	return (
		normalized.includes('403') ||
		normalized.includes('401') ||
		normalized.includes('forbidden') ||
		normalized.includes('unauthorized') ||
		normalized.includes('cloudflare') ||
		normalized.includes('challenge-platform') ||
		normalized.includes('too many requests') ||
		normalized.includes('rate limit') ||
		normalized.includes('fetch failed') ||
		normalized.includes('econnrefused') ||
		normalized.includes('enotfound') ||
		normalized.includes('unable to verify the first certificate') ||
		normalized.includes('certificate') ||
		normalized.includes('socket hang up')
	);
};

const isVitestErrorText = (error: string | undefined): boolean => {
	const normalized = normalize(error);
	if (normalized.length === 0) {
		return false;
	}

	return normalized.includes('vitest') || normalized.includes('failed tests:') || normalized.includes('no tests were executed');
};

const isRuntimeErrorText = (error: string | undefined): boolean => {
	const normalized = normalize(error);
	if (normalized.length === 0) {
		return false;
	}

	return (
		normalized.includes('typeerror') ||
		normalized.includes('referenceerror') ||
		normalized.includes('syntaxerror') ||
		normalized.includes('rangeerror') ||
		normalized.includes('assignment to constant variable') ||
		normalized.includes('is not a function')
	);
};

export const inferFailureKindFromErrorText = (error: string | undefined): FailureKind => {
	if (isTimeoutErrorText(error)) {
		return 'timeout';
	}

	if (isConnectivityErrorText(error)) {
		return 'runtime';
	}

	if (isAssertionErrorText(error)) {
		return 'assertion';
	}

	if (isVitestErrorText(error)) {
		return 'vitest';
	}

	if (isRuntimeErrorText(error)) {
		return 'runtime';
	}

	return 'other';
};

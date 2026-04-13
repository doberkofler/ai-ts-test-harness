export const STYLES = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
	yellow: '\x1b[33m',
} as const;

export const styleText = (text: string, style: string): string => (process.stdout.isTTY ? `${style}${text}${STYLES.reset}` : text);

export const formatMs = (durationMs: number): string => {
	if (durationMs < 1000) {
		return `${durationMs}ms`;
	}

	return `${(durationMs / 1000).toFixed(2)}s`;
};

export const formatIsoToLocal = (iso: string): string => {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) {
		return iso;
	}

	return parsed.toLocaleString();
};

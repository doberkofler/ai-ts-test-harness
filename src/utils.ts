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

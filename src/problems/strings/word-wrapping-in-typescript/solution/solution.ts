type WrapOptions = {
	width?: number;
	lineBreak?: string;
	mode?: 'soft' | 'hard';
	hangingIndent?: string;
	collapseWhitespace?: boolean;
};

const __legacySolution = (function wordWrap(text: string, options: WrapOptions = {}): string {
	const width = options.width ?? 80;
	const lineBreak = options.lineBreak ?? '\n';
	const mode = options.mode ?? 'soft';
	const hangingIndent = options.hangingIndent ?? '';
	const collapseWhitespace = options.collapseWhitespace ?? false;

	const normalizeLine = (line: string): string => {
		if (collapseWhitespace === false) {
			return line;
		}

		return line.replace(/ +/g, ' ');
	};

	const findBreak = (value: string, maxContentWidth: number): {chunk: string; rest: string} | undefined => {
		const maxIndex = Math.min(maxContentWidth, value.length - 1);
		for (let i = maxIndex; i >= 0; i--) {
			const char = value[i];
			if (char === ' ') {
				const chunk = value.slice(0, i);
				const rest = value.slice(i + 1).replace(/^ +/, '');
				return {chunk, rest};
			}

			if (char === '-' && i < maxContentWidth) {
				const splitAt = i + 1;
				return {
					chunk: value.slice(0, splitAt),
					rest: value.slice(splitAt),
				};
			}
		}

		return undefined;
	};

	const wrapLine = (line: string): string[] => {
		const normalized = normalizeLine(line);
		if (normalized.length === 0) {
			return [''];
		}

		const wrapped: string[] = [];
		let remaining = normalized;
		let isFirstOutputLine = true;

		while (remaining.length > 0) {
			const prefix = isFirstOutputLine ? '' : hangingIndent;
			const contentWidth = Math.max(1, width - prefix.length);

			if (remaining.length <= contentWidth) {
				wrapped.push(`${prefix}${remaining}`);
				break;
			}

			const breakResult = findBreak(remaining, contentWidth);
			if (typeof breakResult !== 'undefined') {
				wrapped.push(`${prefix}${breakResult.chunk}`);
				remaining = breakResult.rest;
				isFirstOutputLine = false;
				continue;
			}

			if (mode === 'soft') {
				wrapped.push(`${prefix}${remaining}`);
				break;
			}

			wrapped.push(`${prefix}${remaining.slice(0, contentWidth)}`);
			remaining = remaining.slice(contentWidth);
			isFirstOutputLine = false;
		}

		return wrapped;
	};

	return text
		.split(/\r\n|\r|\n/)
		.flatMap((line) => wrapLine(line))
		.join(lineBreak);
});

export const wordWrap = __legacySolution;

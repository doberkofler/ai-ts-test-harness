const __legacySolution = (function toNumber(s: string): number | null {
		const trimmed = s.trim();
		if (trimmed.length === 0) {
			return null;
		}

		let sign = 1;
		let index = 0;
		if (trimmed[index] === '-') {
			sign = -1;
			index = 1;
		}

		if (index >= trimmed.length) {
			return null;
		}

		let seenDot = false;
		let seenDigit = false;
		let intPart = 0;
		let fracPart = 0;
		let fracScale = 1;

		for (; index < trimmed.length; index++) {
			const ch = trimmed[index];
			if (ch === '.') {
				if (seenDot) {
					return null;
				}
				seenDot = true;
				continue;
			}

			if (typeof ch !== 'string') {
				return null;
			}

			const code = ch.charCodeAt(0);
			if (code < 48 || code > 57) {
				return null;
			}

			seenDigit = true;
			const digit = code - 48;
			if (seenDot) {
				fracPart = fracPart * 10 + digit;
				fracScale *= 10;
			} else {
				intPart = intPart * 10 + digit;
			}
		}

		if (!seenDigit) {
			return null;
		}

		if (seenDot && fracScale === 1) {
			return null;
		}

		const value = intPart + fracPart / fracScale;
		if (value === 0) {
			return 0;
		}

		return sign * value;
	});
export const toNumber = __legacySolution;

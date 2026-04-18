const __legacySolution = (function safeJsonParse(input: string): unknown {
		try {
			return JSON.parse(input);
		} catch {
			return null;
		}
	});
export const safeJsonParse = __legacySolution;

export type RunTransferStats = {
	promptChars: number;
	responseChars: number;
};

const CHARS_PER_TOKEN_ESTIMATE = 4;

export const estimateTokensFromChars = (chars: number): number => Math.max(0, Math.round(chars / CHARS_PER_TOKEN_ESTIMATE));

export const calculateAverageTokensPerSecond = (tokensReceived: number, llmDurationMs: number): number => {
	if (llmDurationMs <= 0) {
		return 0;
	}

	return Math.round((tokensReceived * 1000) / llmDurationMs);
};

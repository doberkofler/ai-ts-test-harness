export type ResultsSummary = {
	total: number;
	passed: number;
	failed: number;
	passRatePercent: number;
};

type ResultLike = {
	passed: boolean;
};

export const summarizeResults = (results: readonly ResultLike[]): ResultsSummary => {
	const passed = results.filter((result) => result.passed).length;
	const total = results.length;
	const failed = total - passed;

	return {
		total,
		passed,
		failed,
		passRatePercent: total === 0 ? 0 : Math.round((passed / total) * 100),
	};
};

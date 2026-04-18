const __legacySolution = (function insertThousandsSeparatorsLookahead(n: string): string {
		return n.replaceAll(/\B(?=(\d{3})+(?!\d))/g, ',');
	});
export const insertThousandsSeparatorsLookahead = __legacySolution;

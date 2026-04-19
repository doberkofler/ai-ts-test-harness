export const sql03RunningTotalQuery = (): string => {
	return `
		SELECT
			id,
			sale_date,
			amount,
			SUM(amount) OVER (
				ORDER BY sale_date ASC, id ASC
				ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
			) AS running_total
		FROM sales
		ORDER BY sale_date ASC, id ASC;
	`;
};

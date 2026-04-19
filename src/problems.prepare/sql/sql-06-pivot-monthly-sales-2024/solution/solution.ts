export const sql06PivotMonthlySales2024Query = (): string => {
	return `
		SELECT
			product_id,
			SUM(CASE WHEN sale_month = DATE '2024-01-01' THEN amount ELSE 0 END) AS jan,
			SUM(CASE WHEN sale_month = DATE '2024-02-01' THEN amount ELSE 0 END) AS feb,
			SUM(CASE WHEN sale_month = DATE '2024-03-01' THEN amount ELSE 0 END) AS mar,
			SUM(CASE WHEN sale_month = DATE '2024-04-01' THEN amount ELSE 0 END) AS apr,
			SUM(CASE WHEN sale_month = DATE '2024-05-01' THEN amount ELSE 0 END) AS may,
			SUM(CASE WHEN sale_month = DATE '2024-06-01' THEN amount ELSE 0 END) AS jun,
			SUM(CASE WHEN sale_month = DATE '2024-07-01' THEN amount ELSE 0 END) AS jul,
			SUM(CASE WHEN sale_month = DATE '2024-08-01' THEN amount ELSE 0 END) AS aug,
			SUM(CASE WHEN sale_month = DATE '2024-09-01' THEN amount ELSE 0 END) AS sep,
			SUM(CASE WHEN sale_month = DATE '2024-10-01' THEN amount ELSE 0 END) AS oct,
			SUM(CASE WHEN sale_month = DATE '2024-11-01' THEN amount ELSE 0 END) AS nov,
			SUM(CASE WHEN sale_month = DATE '2024-12-01' THEN amount ELSE 0 END) AS dec
		FROM sales
		WHERE sale_month >= DATE '2024-01-01'
			AND sale_month < DATE '2025-01-01'
		GROUP BY product_id
		ORDER BY product_id;
	`;
};

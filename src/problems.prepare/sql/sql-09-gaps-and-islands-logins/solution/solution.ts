export const sql09ConsecutiveLoginRangesQuery = (): string => {
	return `
		WITH ranked AS (
			SELECT
				user_id,
				login_date,
				ROW_NUMBER() OVER (
					PARTITION BY user_id
					ORDER BY login_date
				) AS rn
			FROM user_logins
		),
		grouped AS (
			SELECT
				user_id,
				login_date,
				login_date - (rn * INTERVAL '1 day') AS grp
			FROM ranked
		)
		SELECT
			user_id,
			MIN(login_date) AS start_date,
			MAX(login_date) AS end_date
		FROM grouped
		GROUP BY user_id, grp
		ORDER BY user_id, start_date;
	`;
};

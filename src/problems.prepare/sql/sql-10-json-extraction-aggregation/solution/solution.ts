export const sql10JsonAggregationQuery = (): string => {
	return `
		SELECT
			payload->>'type' AS event_type,
			COUNT(*) AS event_count
		FROM events
		WHERE created_at >= TIMESTAMP '2024-01-01 00:00:00'
			AND created_at < TIMESTAMP '2025-01-01 00:00:00'
			AND payload->>'type' IS NOT NULL
		GROUP BY payload->>'type'
		ORDER BY event_count DESC, event_type ASC;
	`;
};

export const sql07DeleteOldPendingOrdersQuery = (): string => {
	return `
		DELETE FROM orders AS o
		WHERE o.status = 'pending'
			AND o.created_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
			AND (
				SELECT COUNT(*)
				FROM orders AS o2
				WHERE o2.customer_id = o.customer_id
			) > 10;
	`;
};

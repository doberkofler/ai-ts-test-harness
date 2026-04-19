CREATE OR REPLACE PROCEDURE get_orders_by_status(
	p_status IN VARCHAR2,
	p_cursor OUT SYS_REFCURSOR
) IS
BEGIN
	OPEN p_cursor FOR
		SELECT *
		FROM orders
		WHERE status = p_status
		ORDER BY created_at DESC;
END get_orders_by_status;
/

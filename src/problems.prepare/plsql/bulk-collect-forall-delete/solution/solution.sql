DECLARE
	TYPE t_customer_ids IS TABLE OF customers.customer_id%TYPE;
	v_customer_ids t_customer_ids;
	v_deleted_orders NUMBER := 0;
	v_deleted_customers NUMBER := 0;
BEGIN
	SELECT customer_id
	BULK COLLECT INTO v_customer_ids
	FROM customers
	WHERE status = 'inactive'
		AND last_order_date < (SYSDATE - 365);

	IF v_customer_ids.COUNT > 0 THEN
		FORALL i IN 1 .. v_customer_ids.COUNT
			DELETE FROM orders
			WHERE customer_id = v_customer_ids(i);

		v_deleted_orders := SQL%ROWCOUNT;

		FORALL i IN 1 .. v_customer_ids.COUNT
			DELETE FROM customers
			WHERE customer_id = v_customer_ids(i);

		v_deleted_customers := SQL%ROWCOUNT;
	END IF;

	DBMS_OUTPUT.PUT_LINE('Total rows deleted: ' || (v_deleted_orders + v_deleted_customers));
END;
/

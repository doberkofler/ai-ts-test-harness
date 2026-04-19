CREATE OR REPLACE PROCEDURE process_overdue_orders(p_days_overdue IN NUMBER) IS
	v_batch_count NUMBER := 0;
BEGIN
	IF p_days_overdue <= 0 THEN
		raise_application_error(-20001, 'p_days_overdue must be greater than zero');
	END IF;

	FOR r_order IN (
		SELECT order_id
		FROM orders
		WHERE status = 'open'
			AND created_at < (SYSDATE - p_days_overdue)
	) LOOP
		UPDATE orders
		SET status = 'overdue'
		WHERE order_id = r_order.order_id;

		INSERT INTO audit_log (order_id, changed_at, reason)
		VALUES (r_order.order_id, SYSDATE, 'Order marked overdue by process_overdue_orders');

		v_batch_count := v_batch_count + 1;
		IF MOD(v_batch_count, 500) = 0 THEN
			COMMIT;
		END IF;
	END LOOP;

	COMMIT;
END process_overdue_orders;
/

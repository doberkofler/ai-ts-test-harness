CREATE OR REPLACE PACKAGE order_cache IS
	FUNCTION get_total(p_order_id NUMBER) RETURN NUMBER;
	PROCEDURE invalidate(p_order_id NUMBER);
	PROCEDURE clear_all;
END order_cache;
/

CREATE OR REPLACE PACKAGE BODY order_cache IS
	TYPE t_total_cache IS TABLE OF orders.order_total%TYPE INDEX BY PLS_INTEGER;
	g_total_cache t_total_cache;

	FUNCTION get_total(p_order_id NUMBER) RETURN NUMBER IS
		v_total orders.order_total%TYPE;
	BEGIN
		IF g_total_cache.EXISTS(p_order_id) THEN
			RETURN g_total_cache(p_order_id);
		END IF;

		SELECT order_total
		INTO v_total
		FROM orders
		WHERE order_id = p_order_id;

		g_total_cache(p_order_id) := v_total;
		RETURN v_total;
	END get_total;

	PROCEDURE invalidate(p_order_id NUMBER) IS
	BEGIN
		g_total_cache.DELETE(p_order_id);
	END invalidate;

	PROCEDURE clear_all IS
	BEGIN
		g_total_cache.DELETE;
	END clear_all;
END order_cache;
/

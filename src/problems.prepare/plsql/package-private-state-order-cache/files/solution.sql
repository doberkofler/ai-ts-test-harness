CREATE OR REPLACE PACKAGE order_cache IS
	FUNCTION get_total(p_order_id NUMBER) RETURN NUMBER;
	PROCEDURE invalidate(p_order_id NUMBER);
	PROCEDURE clear_all;
END order_cache;
/

CREATE OR REPLACE PACKAGE BODY order_cache IS
BEGIN
	-- TODO: Implement package body with private state.
	NULL;
END order_cache;
/

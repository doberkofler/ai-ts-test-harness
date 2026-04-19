CREATE OR REPLACE TRIGGER trg_products_audit
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
	-- TODO: Insert one product_audit row for each changed column.
	NULL;
END;
/

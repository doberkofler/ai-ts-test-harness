CREATE OR REPLACE TRIGGER trg_products_audit
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
	IF NVL(:OLD.product_name, '~NULL~') <> NVL(:NEW.product_name, '~NULL~') THEN
		INSERT INTO product_audit (product_id, column_name, old_value, new_value, changed_by, changed_at)
		VALUES (:NEW.id, 'product_name', :OLD.product_name, :NEW.product_name, USER, SYSDATE);
	END IF;

	IF NVL(:OLD.description, '~NULL~') <> NVL(:NEW.description, '~NULL~') THEN
		INSERT INTO product_audit (product_id, column_name, old_value, new_value, changed_by, changed_at)
		VALUES (:NEW.id, 'description', :OLD.description, :NEW.description, USER, SYSDATE);
	END IF;

	IF NVL(TO_CHAR(:OLD.price), '~NULL~') <> NVL(TO_CHAR(:NEW.price), '~NULL~') THEN
		INSERT INTO product_audit (product_id, column_name, old_value, new_value, changed_by, changed_at)
		VALUES (:NEW.id, 'price', TO_CHAR(:OLD.price), TO_CHAR(:NEW.price), USER, SYSDATE);
	END IF;

	IF NVL(:OLD.status, '~NULL~') <> NVL(:NEW.status, '~NULL~') THEN
		INSERT INTO product_audit (product_id, column_name, old_value, new_value, changed_by, changed_at)
		VALUES (:NEW.id, 'status', :OLD.status, :NEW.status, USER, SYSDATE);
	END IF;

	IF NVL(TO_CHAR(:OLD.stock_qty), '~NULL~') <> NVL(TO_CHAR(:NEW.stock_qty), '~NULL~') THEN
		INSERT INTO product_audit (product_id, column_name, old_value, new_value, changed_by, changed_at)
		VALUES (:NEW.id, 'stock_qty', TO_CHAR(:OLD.stock_qty), TO_CHAR(:NEW.stock_qty), USER, SYSDATE);
	END IF;
END;
/

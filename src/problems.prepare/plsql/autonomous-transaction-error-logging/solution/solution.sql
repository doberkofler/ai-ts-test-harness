CREATE OR REPLACE PROCEDURE log_error(
	p_proc_name IN VARCHAR2,
	p_error_code IN NUMBER,
	p_error_msg IN VARCHAR2
) IS
	PRAGMA AUTONOMOUS_TRANSACTION;
BEGIN
	INSERT INTO error_log (proc_name, error_code, error_msg, logged_at)
	VALUES (p_proc_name, p_error_code, p_error_msg, SYSDATE);

	COMMIT;
END log_error;
/

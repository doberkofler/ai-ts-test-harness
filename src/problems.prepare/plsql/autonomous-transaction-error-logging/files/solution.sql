CREATE OR REPLACE PROCEDURE log_error(
	p_proc_name IN VARCHAR2,
	p_error_code IN NUMBER,
	p_error_msg IN VARCHAR2
) IS
BEGIN
	-- TODO: Implement autonomous error logging.
	NULL;
END log_error;
/

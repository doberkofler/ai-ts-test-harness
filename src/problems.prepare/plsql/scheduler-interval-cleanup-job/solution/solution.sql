BEGIN
	DBMS_SCHEDULER.CREATE_JOB(
		job_name => 'CLEANUP_EXPIRED_TOKENS',
		job_type => 'STORED_PROCEDURE',
		job_action => 'SECURITY_PKG.PURGE_EXPIRED_TOKENS',
		start_date => SYSTIMESTAMP,
		repeat_interval => 'FREQ=HOURLY;INTERVAL=6',
		enabled => TRUE,
		auto_drop => FALSE
	);

	DBMS_SCHEDULER.SET_ATTRIBUTE(
		name => 'CLEANUP_EXPIRED_TOKENS',
		attribute => 'max_failures',
		value => 3
	);
END;
/

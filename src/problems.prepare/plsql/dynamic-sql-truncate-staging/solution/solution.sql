CREATE OR REPLACE PROCEDURE truncate_staging_tables(
	p_schema IN VARCHAR2,
	p_truncated_count OUT NUMBER
) IS
BEGIN
	p_truncated_count := 0;

	FOR r_table IN (
		SELECT table_name
		FROM all_tables
		WHERE owner = UPPER(p_schema)
			AND table_name LIKE 'STG_%'
	) LOOP
		BEGIN
			EXECUTE IMMEDIATE 'TRUNCATE TABLE ' || DBMS_ASSERT.ENQUOTE_NAME(UPPER(p_schema), FALSE) || '.' || DBMS_ASSERT.ENQUOTE_NAME(r_table.table_name, FALSE);
			p_truncated_count := p_truncated_count + 1;
		EXCEPTION
			WHEN OTHERS THEN
				IF SQLCODE = -942 THEN
					NULL;
				ELSE
					RAISE;
				END IF;
		END;
	END LOOP;
END truncate_staging_tables;
/

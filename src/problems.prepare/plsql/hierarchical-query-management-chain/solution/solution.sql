SELECT
	LEVEL AS level_num,
	name,
	SYS_CONNECT_BY_PATH(name, ' / ') AS name_path
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR id = manager_id
AND id IN (
	SELECT id
	FROM employees
	START WITH id = 42
	CONNECT BY PRIOR manager_id = id
)
ORDER BY LEVEL;

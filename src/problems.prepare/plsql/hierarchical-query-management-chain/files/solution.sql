-- Given employees(id, name, manager_id), write a hierarchical query.
SELECT
	LEVEL,
	name,
	SYS_CONNECT_BY_PATH(name, ' > ') AS path
FROM employees;

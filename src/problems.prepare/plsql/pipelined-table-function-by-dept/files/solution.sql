CREATE TYPE t_employee_row AS OBJECT (
	employee_id NUMBER,
	first_name VARCHAR2(100),
	last_name VARCHAR2(100),
	email VARCHAR2(200)
);
/

CREATE TYPE t_employee_tab AS TABLE OF t_employee_row;
/

CREATE OR REPLACE FUNCTION get_employees_by_dept(p_dept_id NUMBER)
	RETURN t_employee_tab PIPELINED
IS
BEGIN
	-- TODO: Implement function.
	NULL;
	RETURN;
END get_employees_by_dept;
/

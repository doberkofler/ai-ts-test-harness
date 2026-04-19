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
	FOR r_emp IN (
		SELECT employee_id, first_name, last_name, email
		FROM employees
		WHERE department_id = p_dept_id
	) LOOP
		PIPE ROW (t_employee_row(r_emp.employee_id, r_emp.first_name, r_emp.last_name, r_emp.email));
	END LOOP;

	RETURN;
END get_employees_by_dept;
/

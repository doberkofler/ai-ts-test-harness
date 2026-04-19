export const sql04SecondHighestSalaryPerDepartmentQuery = (): string => {
	return `
		SELECT
			e.dept_id,
			e.name AS employee_name,
			e.salary
		FROM employees AS e
		WHERE 1 = (
			SELECT COUNT(DISTINCT e2.salary)
			FROM employees AS e2
			WHERE e2.dept_id = e.dept_id
				AND e2.salary > e.salary
		)
		ORDER BY e.dept_id, e.name;
	`;
};

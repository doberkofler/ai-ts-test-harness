export const sql01DepartmentAverageSalaryQuery = (): string => {
	return `
		SELECT
			d.name AS department_name,
			AVG(e.salary) AS avg_salary
		FROM departments AS d
		LEFT JOIN employees AS e ON e.dept_id = d.id
		GROUP BY d.id, d.name
		ORDER BY avg_salary DESC;
	`;
};

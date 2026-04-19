export const sql02EmployeeManagerQuery = (): string => {
	return `
		SELECT
			e.name AS employee_name,
			m.name AS manager_name
		FROM employees AS e
		LEFT JOIN employees AS m ON m.id = e.manager_id
		ORDER BY e.id;
	`;
};

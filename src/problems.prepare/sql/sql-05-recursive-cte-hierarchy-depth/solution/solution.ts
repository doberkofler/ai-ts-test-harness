export const sql05CategoryHierarchyQuery = (): string => {
	return `
		WITH RECURSIVE category_tree AS (
			SELECT
				c.id,
				c.name,
				0 AS depth,
				c.name::text AS path
			FROM categories AS c
			WHERE c.parent_id IS NULL

			UNION ALL

			SELECT
				c.id,
				c.name,
				ct.depth + 1 AS depth,
				ct.path || ' > ' || c.name AS path
			FROM categories AS c
			INNER JOIN category_tree AS ct ON c.parent_id = ct.id
		)
		SELECT id, name, depth, path
		FROM category_tree
		ORDER BY path;
	`;
};

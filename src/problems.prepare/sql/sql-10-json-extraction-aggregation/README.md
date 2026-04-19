# sql-10-json-extraction-aggregation

The original request provided schema and title but did not include an explicit task statement.

To keep this problem actionable and testable, this repository tracks the following assumption:

- Extract `payload->>'type'` as `event_type`.
- Count rows per type as `event_count`.
- Restrict to events created during calendar year 2024.
- Exclude rows where `payload->>'type'` is `NULL`.

If you want a different JSON aggregation target (for example, by `page`, by day, or distinct users), update `problem.json`, `tests/problem.test.ts`, and `solution/solution.ts` together.

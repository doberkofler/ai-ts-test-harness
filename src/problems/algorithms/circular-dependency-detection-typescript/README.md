# Circular Dependency Detection in TypeScript Source Files

Notes tracked for this problem:

- Only local relative imports are considered (specifiers that start with `.`).
- Import resolution accepts these forms: exact file path, `<path>.ts`, and `<path>/index.ts`.
- Cycle output should be deterministic and de-duplicated by rotation (the same directed cycle is reported once).
- Cycle printing uses ASCII arrows: `A -> B -> A`.

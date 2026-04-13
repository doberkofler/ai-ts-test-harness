## kind
direct-refactor

## category
refactor

## description
- Rename all local variables and parameters in the given TypeScript code to descriptive, semantically meaningful names that reflect their purpose in context. Preserve all logic, structure, and type annotations.

## input
```ts
function computeDiscount(a: number, b: number): number {
	const tmp = a * (b / 100);
	const res = a - tmp;
	return res;
}
```

## tests
```ts
const originalComputeDiscount = evaluateRefactorFunction(input, 'computeDiscount') as (amount: number, percent: number) => number;
const transformedComputeDiscount = evaluateRefactorFunction(result, 'computeDiscount') as (amount: number, percent: number) => number;

assert.strictEqual(transformedComputeDiscount(100, 10), originalComputeDiscount(100, 10));
assert.strictEqual(transformedComputeDiscount(49.99, 12.5), originalComputeDiscount(49.99, 12.5));
assert.strictEqual(transformedComputeDiscount(0, 75), originalComputeDiscount(0, 75));
assert.doesNotMatch(result, /\btmp\b/, 'tmp must be renamed');
assert.doesNotMatch(result, /\bres\b/, 'res must be renamed');
assert.doesNotMatch(result, /\ba\b/, 'param a must be renamed');
assert.doesNotMatch(result, /\bb\b/, 'param b must be renamed');
assert.match(result, /function computeDiscount/, 'function name must be preserved');
```

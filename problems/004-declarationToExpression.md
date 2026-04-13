## kind
direct-refactor

## category
refactor

## description
- Refactor the given TypeScript function declaration into a const arrow function expression. Preserve the parameter list, type annotations, and body exactly.

## input
```ts
function multiply(a: number, b: number): number {
	return a * b;
}
```

## tests
```ts
const originalMultiply = evaluateRefactorFunction(input, 'multiply') as (left: number, right: number) => number;
const transformedMultiply = evaluateRefactorFunction(result, 'multiply') as (left: number, right: number) => number;

assert.strictEqual(transformedMultiply(3, 4), originalMultiply(3, 4));
assert.strictEqual(transformedMultiply(-2, 5), originalMultiply(-2, 5));
assert.strictEqual(transformedMultiply(0, 99), originalMultiply(0, 99));
assert.doesNotMatch(result, /function\s+multiply\s*\(/, 'function declaration must be refactored');
assert.match(result, /const\s+multiply\s*=/, 'const binding must exist');
assert.match(result, /=>/, 'arrow function syntax must exist');
```

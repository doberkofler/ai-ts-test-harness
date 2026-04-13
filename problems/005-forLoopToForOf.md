## kind
direct-refactor

## category
refactor

## description
- Refactor the given TypeScript indexed for(;;) loop that iterates an array by index into an equivalent for...of loop. Preserve all surrounding code and logic.

## input
```ts
function sumAll(numbers: number[]): number {
	let total = 0;
	for (let i = 0; i < numbers.length; i++) {
		total += numbers[i];
	}
	return total;
}
```

## tests
```ts
const originalSumAll = evaluateRefactorFunction(input, 'sumAll') as (numbers: number[]) => number;
const transformedSumAll = evaluateRefactorFunction(result, 'sumAll') as (numbers: number[]) => number;

assert.strictEqual(transformedSumAll([1, 2, 3, 4]), originalSumAll([1, 2, 3, 4]));
assert.strictEqual(transformedSumAll([10, -5, 4]), originalSumAll([10, -5, 4]));
assert.strictEqual(transformedSumAll([]), originalSumAll([]));
assert.doesNotMatch(result, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*numbers\.length\s*;\s*i\+\+\s*\)/, 'indexed loop must be removed');
assert.match(result, /for\s*\(\s*const\s+\w+\s+of\s+numbers\s*\)/, 'for...of loop must exist');
```

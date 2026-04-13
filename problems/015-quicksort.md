## kind
implement-function

## category
algorithms

## description
- Sort an array of numbers in ascending order using the quicksort algorithm.
- Must implement quicksort recursively; do not use Array.prototype.sort or any other built-in sort.
- Return a new array, do not mutate the input.

## signature
```ts
function quicksort(arr: number[]): number[]
```

## tests
```ts
// basic
assert.deepStrictEqual(quicksort([3, 1, 2]),              [1, 2, 3]);
assert.deepStrictEqual(quicksort([5, 4, 3, 2, 1]),        [1, 2, 3, 4, 5]);
assert.deepStrictEqual(quicksort([1, 2, 3, 4, 5]),        [1, 2, 3, 4, 5]);

// edge cases
assert.deepStrictEqual(quicksort([]),                     []);
assert.deepStrictEqual(quicksort([1]),                    [1]);
assert.deepStrictEqual(quicksort([2, 2, 2]),              [2, 2, 2]);

// negatives and mixed
assert.deepStrictEqual(quicksort([-3, 0, -1, 2]),         [-3, -1, 0, 2]);
assert.deepStrictEqual(quicksort([0, -1, 0, 1]),          [-1, 0, 0, 1]);

// does not mutate input
const original = [3, 1, 2];
quicksort(original);
assert.deepStrictEqual(original, [3, 1, 2]);

// larger random-ish input
assert.deepStrictEqual(
	quicksort([42, 7, 19, 3, 99, 0, -5, 23, 7]),
	[-5, 0, 3, 7, 7, 19, 23, 42, 99],
);
```

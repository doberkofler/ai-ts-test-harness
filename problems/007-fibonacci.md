## kind
implement-function

## category
algorithms

## description
- Return the nth Fibonacci number (0-indexed). fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, ...

## signature
```ts
function fibonacci(n: number): number
```

## tests
```ts
assert.strictEqual(fibonacci(0),  0);
assert.strictEqual(fibonacci(1),  1);
assert.strictEqual(fibonacci(2),  1);
assert.strictEqual(fibonacci(3),  2);
assert.strictEqual(fibonacci(4),  3);
assert.strictEqual(fibonacci(5),  5);
assert.strictEqual(fibonacci(10), 55);
assert.strictEqual(fibonacci(15), 610);
```

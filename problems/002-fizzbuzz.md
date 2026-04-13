## kind
implement-function

## category
logic

## description
- Given a number n, return "Fizz" if divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if both, otherwise the number as a string.

## signature
```ts
function fizzbuzz(n: number): string
```

## tests
```ts
assert.strictEqual(fizzbuzz(1),  '1');
assert.strictEqual(fizzbuzz(3),  'Fizz');
assert.strictEqual(fizzbuzz(5),  'Buzz');
assert.strictEqual(fizzbuzz(15), 'FizzBuzz');
assert.strictEqual(fizzbuzz(9),  'Fizz');
assert.strictEqual(fizzbuzz(10), 'Buzz');
```

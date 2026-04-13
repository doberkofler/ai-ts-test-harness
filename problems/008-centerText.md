## kind
implement-function

## category
strings

## description
- Center a string within a field of the given width using spaces.
- If the padding is odd, the extra space goes to the right.
- If the string is >= width, return it unchanged.

## signature
```ts
function centerText(text: string, width: number): string
```

## tests
```ts
assert.strictEqual(centerText('hi',    6),  '  hi  ');
assert.strictEqual(centerText('hello', 9),  '  hello  ');
assert.strictEqual(centerText('hi',    5),  ' hi  ');
assert.strictEqual(centerText('a',     5),  '  a  ');
assert.strictEqual(centerText('hello', 5),  'hello');
assert.strictEqual(centerText('hello', 3),  'hello');
assert.strictEqual(centerText('',      4),  '    ');
```

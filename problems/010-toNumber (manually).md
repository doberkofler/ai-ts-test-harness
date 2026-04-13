## kind
implement-function

## category
parsing

## description
- Parse a string to a number by manually inspecting each character.
- Trim whitespace before parsing.
- Return null if the string is empty, blank, or contains any non-numeric characters.
- Support an optional leading minus sign and a single decimal point.
- Do NOT use parseFloat, parseInt, Number(), +, or any built-in string-to-number conversion.

## signature
```ts
function toNumber(s: string): number | null
```

## tests
```ts
assert.strictEqual(toNumber('42'),       42);
assert.strictEqual(toNumber('3.14'),     3.14);
assert.strictEqual(toNumber('-7'),       -7);
assert.strictEqual(toNumber('-3.14'),    -3.14);
assert.strictEqual(toNumber('  42  '),   42);
assert.strictEqual(toNumber('abc'),      null);
assert.strictEqual(toNumber(''),         null);
assert.strictEqual(toNumber('   '),      null);
assert.strictEqual(toNumber('12abc'),    null);
assert.strictEqual(toNumber('1.2.3'),    null);
assert.strictEqual(toNumber('-'),        null);
assert.strictEqual(toNumber('-.'),       null);
assert.strictEqual(toNumber('.'),        null);
assert.strictEqual(toNumber('Infinity'), null);
assert.strictEqual(toNumber('-0'),       0);
assert.strictEqual(toNumber('007'),      7);
```

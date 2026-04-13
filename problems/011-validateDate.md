## kind
implement-function

## category
date-time

## description
- Return true if the string is a valid calendar date in YYYY-MM-DD format, false otherwise.
- Must reject invalid months, out-of-range days, and incorrect leap-year dates.

## signature
```ts
function validateDate(s: string): boolean
```

## tests
```ts
assert.strictEqual(validateDate('2024-01-15'), true);
assert.strictEqual(validateDate('2024-02-29'), true);   // 2024 is a leap year
assert.strictEqual(validateDate('2023-02-29'), false);  // 2023 is not
assert.strictEqual(validateDate('2024-13-01'), false);  // invalid month
assert.strictEqual(validateDate('2024-00-01'), false);  // month zero
assert.strictEqual(validateDate('2024-01-00'), false);  // day zero
assert.strictEqual(validateDate('2024-01-32'), false);  // day out of range
assert.strictEqual(validateDate('2024-04-31'), false);  // April has 30 days
assert.strictEqual(validateDate('not-a-date'), false);
assert.strictEqual(validateDate(''),           false);
```

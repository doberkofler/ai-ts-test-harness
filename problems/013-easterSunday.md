## kind
implement-function

## category
date-time

## description
- Return the month (1-12) and day of Easter Sunday for a given year using the Anonymous Gregorian algorithm.

## signature
```ts
function easterSunday(year: number): {month: number; day: number}
```

## tests
```ts
assert.deepStrictEqual(easterSunday(2024), {month: 3,  day: 31});
assert.deepStrictEqual(easterSunday(2025), {month: 4,  day: 20});
assert.deepStrictEqual(easterSunday(2023), {month: 4,  day: 9});
assert.deepStrictEqual(easterSunday(2000), {month: 4,  day: 23});
assert.deepStrictEqual(easterSunday(1999), {month: 4,  day: 4});
assert.deepStrictEqual(easterSunday(1954), {month: 4,  day: 18});
```

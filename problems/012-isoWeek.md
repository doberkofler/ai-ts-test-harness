## kind
implement-function

## category
date-time

## description
- Return the ISO 8601 week number and ISO year for a given Date.
- The ISO year may differ from the calendar year near year boundaries.

## signature
```ts
function isoWeek(date: Date): {week: number; year: number}
```

## tests
```ts
// Jan 1 2024 is a Monday → week 1 of 2024
assert.deepStrictEqual(isoWeek(new Date(2024, 0, 1)),  {week: 1,  year: 2024});
// Jan 8 2024 → week 2
assert.deepStrictEqual(isoWeek(new Date(2024, 0, 8)),  {week: 2,  year: 2024});
// Dec 30 2024 is a Monday → week 1 of 2025
assert.deepStrictEqual(isoWeek(new Date(2024, 11, 30)), {week: 1,  year: 2025});
// Jan 1 2023 is a Sunday → belongs to week 52 of 2022
assert.deepStrictEqual(isoWeek(new Date(2023, 0, 1)),  {week: 52, year: 2022});
// Mar 14 2024 → week 11
assert.deepStrictEqual(isoWeek(new Date(2024, 2, 14)), {week: 11, year: 2024});
```

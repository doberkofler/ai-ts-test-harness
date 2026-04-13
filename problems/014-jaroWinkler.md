## kind
implement-function

## category
strings

## description
- Compute the Jaro-Winkler similarity between two strings.
- Returns a value in [0, 1] where 1 is an exact match and 0 is no similarity.
- The Jaro score is based on matching characters (within floor(max(|s1|,|s2|)/2)-1 distance) and transpositions.
- The Winkler adjustment adds a prefix bonus (p=0.1, max prefix length=4): result = jaro + (prefixLen * p * (1 - jaro)).
- Matching is case-sensitive.
- Empty string vs empty string = 1.
- Non-empty string vs empty string = 0.

## signature
```ts
function jaroWinkler(s1: string, s2: string): number
```

## tests
```ts
// exact matches
assert.strictEqual(jaroWinkler('', ''),           1);
assert.strictEqual(jaroWinkler('abc', 'abc'),     1);

// one empty
assert.strictEqual(jaroWinkler('abc', ''),        0);
assert.strictEqual(jaroWinkler('', 'abc'),        0);

// classic test vectors — round to 4 decimal places to avoid float noise
const r = (n: number) => Math.round(n * 10000) / 10000;

assert.strictEqual(r(jaroWinkler('MARTHA',  'MARHTA')),   0.9611);
assert.strictEqual(r(jaroWinkler('DIXON',   'DICKSONX')), 0.8133);
assert.strictEqual(r(jaroWinkler('JELLYFISH','SMELLYFISH')), 0.8967);
assert.strictEqual(r(jaroWinkler('ABC', 'XYZ')),          0);
assert.strictEqual(r(jaroWinkler('CRATE', 'TRACE')),      0.7333);

// prefix bonus visible: shared prefix pushes score up
assert.ok(jaroWinkler('ABCDEF', 'ABCXYZ') > jaroWinkler('XBCDEF', 'ABCXYZ'));

// case-sensitive
assert.ok(jaroWinkler('abc', 'ABC') < 1);
```

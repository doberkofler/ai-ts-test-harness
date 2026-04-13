## kind
implement-function

## category
hashing

## description
- Implement MurmurHash3 (32-bit) for a string input with a numeric seed.
- Process input as UTF-16 code units (use charCodeAt; no TextEncoder or Buffer).
- Process 4 bytes (2 chars) per block.
- Apply the exact MurmurHash3 constants: c1=0xcc9e2d51, c2=0x1b873593, r1=15, r2=13, m=5, n=0xe6546b64.
- Final mix (fmix32): h ^= h>>>16, h=Math.imul(h,0x85ebca6b), h^=h>>>13, h=Math.imul(h,0xc2b2ae35), h^=h>>>16.
- All arithmetic must use Math.imul for 32-bit multiplication and >>> 0 to keep values unsigned.
- Return an unsigned 32-bit integer.
- Do not use crypto, TextEncoder, Buffer, or any built-in hash facility.

## signature
```ts
function murmurhash3(str: string, seed: number): number
```

## tests
```ts
// canonical test vectors — these are the accepted reference values
// for MurmurHash3_x86_32 operating on UTF-16 code units

// empty string — result is the fmix of the seed alone
assert.strictEqual(murmurhash3('', 0),           0);
assert.strictEqual(murmurhash3('', 1),           0x514e28b7);

// single char (partial block)
assert.strictEqual(murmurhash3('a', 0),          0x3c2569b2);

// exactly one full block (2 chars = 4 bytes)
assert.strictEqual(murmurhash3('ab', 0),         0x5f14e8b3);

// two full blocks
assert.strictEqual(murmurhash3('abcd', 0),       0x1f1ee412);

// standard string with known vector
assert.strictEqual(murmurhash3('hello', 0),      0x248bfa47);
assert.strictEqual(murmurhash3('hello', 42),     0x4f2e8b1a);

// longer input
assert.strictEqual(murmurhash3('The quick brown fox', 0), 0x2f9a9e6b);

// seed affects output
assert.notStrictEqual(
	murmurhash3('test', 0),
	murmurhash3('test', 1),
);

// avalanche — one char difference produces very different hash
const h1 = murmurhash3('hello', 0);
const h2 = murmurhash3('hellp', 0);
const diffBits = (h1 ^ h2).toString(2).split('').filter(b => b === '1').length;
assert.ok(diffBits >= 8, `expected >=8 bit differences, got ${diffBits}`);

// must return unsigned 32-bit integer
assert.ok(murmurhash3('negative?', 0) >= 0);
assert.ok(murmurhash3('negative?', 0) <= 0xffffffff);
```

## kind
direct-refactor

## category
refactor

## description
- Refactor the given TypeScript function from Promise .then()/.catch() chaining to async/await with try/catch. Preserve the function name, return type, and error handling behaviour.

## input
```ts
function fetchUser(id: string): Promise<User> {
	return fetch(`/api/users/${id}`)
		.then(res => res.json())
		.catch(err => { throw new Error(`fetch failed: ${err}`); });
}
```

## tests
```ts
const originalFetchUser = evaluateRefactorFunction(input, 'fetchUser') as (id: string) => Promise<unknown>;
const transformedFetchUser = evaluateRefactorFunction(result, 'fetchUser') as (id: string) => Promise<unknown>;

const originalFetch = globalThis.fetch;
try {
	globalThis.fetch = (async (url: string) => ({
		json: async () => ({id: url.split('/').at(-1), source: 'ok'}),
	})) as typeof fetch;

	const originalOk = await originalFetchUser('42');
	const transformedOk = await transformedFetchUser('42');
	assert.deepStrictEqual(transformedOk, originalOk);

	globalThis.fetch = (async () => {
		throw new Error('network down');
	}) as typeof fetch;

	await assert.rejects(() => transformedFetchUser('99'), /fetch failed: Error: network down/);
} finally {
	globalThis.fetch = originalFetch;
}

assert.doesNotMatch(result, /\.then\s*\(/, '.then chain must be removed');
assert.doesNotMatch(result, /\.catch\s*\(/, '.catch chain must be removed');
assert.match(result, /async\s+function\s+fetchUser/, 'function must be async');
assert.match(result, /await\s+fetch\s*\(/, 'await fetch must exist');
assert.match(result, /try\s*\{/, 'try block must exist');
assert.match(result, /catch\s*\(/, 'catch block must exist');
```

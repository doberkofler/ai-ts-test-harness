import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'promises-to-async',
	category: 'refactor',
	description: [
		'Refactor the given TypeScript function from Promise .then()/.catch() chaining to async/await with try/catch. Preserve the function name, return type, and error handling behaviour.',
	],
	input: [
		'function fetchUser(id: string): Promise<User> {',
		['\treturn fetch(`/api/users/', String.fromCodePoint(36), '{id}`)'].join(''),
		'\t\t.then(res => res.json())',
		['\t\t.catch(err => { throw new Error(`fetch failed: ', String.fromCodePoint(36), '{err}`); });'].join(''),
		'}',
	].join('\n'),
	entry: 'fetchUser',
	tests: [
		'const originalFetch = globalThis.fetch;',
		'try {',
		"\tglobalThis.fetch = (async (url: string) => ({json: async () => ({id: url.split('/').at(-1), source: 'ok'})})) as typeof fetch;",
		"\tconst originalOk = await (original as (id: string) => Promise<unknown>)('42');",
		"\tconst transformedOk = await (transformed as (id: string) => Promise<unknown>)('42');",
		'\tassert.deepStrictEqual(transformedOk, originalOk);',
		'\tglobalThis.fetch = (async () => {',
		"\t\tthrow new Error('network down');",
		'\t}) as typeof fetch;',
		"\tawait assert.rejects(() => (transformed as (id: string) => Promise<unknown>)('99'), /fetch failed: Error: network down/);",
		'} finally {',
		'\tglobalThis.fetch = originalFetch;',
		'}',
		String.raw`assert.doesNotMatch(code.result, /\.then\s*\(/, '.then chain must be removed');`,
		String.raw`assert.doesNotMatch(code.result, /\.catch\s*\(/, '.catch chain must be removed');`,
		String.raw`assert.match(code.result, /async\s+function\s+fetchUser/, 'function must be async');`,
		String.raw`assert.match(code.result, /await\s+fetch\s*\(/, 'await fetch must exist');`,
		String.raw`assert.match(code.result, /try\s*\{/, 'try block must exist');`,
		String.raw`assert.match(code.result, /catch\s*\(/, 'catch block must exist');`,
	].join('\n'),
});

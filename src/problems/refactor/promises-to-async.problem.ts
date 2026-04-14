import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'promises-to-async',
	description:
		'Refactor the given TypeScript function from Promise .then()/.catch() chaining to async/await with try/catch. Preserve the function name, return type, and error handling behaviour.',
	input: [
		'function fetchUser(id: string): Promise<User> {',
		['\treturn fetch(`/api/users/', String.fromCodePoint(36), '{id}`)'].join(''),
		'\t\t.then(res => res.json())',
		['\t\t.catch(err => { throw new Error(`fetch failed: ', String.fromCodePoint(36), '{err}`); });'].join(''),
		'}',
	].join('\n'),
	entry: 'fetchUser',
	solution: () =>
		[
			'async function fetchUser(id: string): Promise<User> {',
			'\ttry {',
			['\t\tconst res = await fetch(`/api/users/', String.fromCodePoint(36), '{id}`);'].join(''),
			'\t\treturn await res.json();',
			'\t} catch (err) {',
			['\t\tthrow new Error(`fetch failed: ', String.fromCodePoint(36), '{err}`);'].join(''),
			'\t}',
			'}',
		].join('\n'),
	tests: async ({assert, original, transformed, code}) => {
		const extractIdFromFetchInput = (input: Parameters<typeof fetch>[0]): string => {
			if (typeof input === 'string') {
				return input.split('/').at(-1) ?? '';
			}

			if (input instanceof URL) {
				return input.pathname.split('/').at(-1) ?? '';
			}

			return input.url.split('/').at(-1) ?? '';
		};

		const okFetch: typeof fetch = async (input) => {
			const payload = {id: extractIdFromFetchInput(input), source: 'ok'};
			const response = await Promise.resolve(Response.json(payload));
			return response;
		};

		const failingFetch: typeof fetch = async () => {
			await Promise.resolve();
			throw new Error('network down');
		};

		const originalFetch = globalThis.fetch;

		try {
			globalThis.fetch = okFetch;
			const originalOk = await original('42');
			const transformedOk = await transformed('42');
			assert.deepStrictEqual(transformedOk, originalOk);
			globalThis.fetch = failingFetch;
			await assert.rejects(async () => {
				await transformed('99');
			}, /fetch failed: Error: network down/);
		} finally {
			globalThis.fetch = originalFetch;
		}

		assert.doesNotMatch(code.result, /\.then\s*\(/, '.then chain must be removed');
		assert.doesNotMatch(code.result, /\.catch\s*\(/, '.catch chain must be removed');
		assert.match(code.result, /async\s+function\s+fetchUser/, 'function must be async');
		assert.match(code.result, /await\s+fetch\s*\(/, 'await fetch must exist');
		assert.match(code.result, /try\s*\{/, 'try block must exist');
		assert.match(code.result, /catch\s*\(/, 'catch block must exist');
	},
});

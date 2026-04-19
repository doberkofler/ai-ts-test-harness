import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import ts from 'typescript';
import {describe, it} from 'vitest';

type AxiosCall = {
	url: string;
	body?: unknown;
	config?: {
		readonly params?: unknown;
		readonly headers?: Record<string, string>;
	};
};

type AxiosMock = {
	readonly getCalls: AxiosCall[];
	readonly postCalls: AxiosCall[];
	get: (url: string, config?: AxiosCall['config']) => Promise<{data: unknown}>;
	post: (url: string, body?: unknown, config?: AxiosCall['config']) => Promise<{data: unknown}>;
	setGetData: (data: unknown) => void;
	setPostData: (data: unknown) => void;
};

declare global {
	var __TEST_AXIOS__: AxiosMock | undefined;
}

const resolveExistingFileUrl = (relativePaths: readonly string[]): URL => {
	for (const relativePath of relativePaths) {
		const candidate = new URL(relativePath, import.meta.url);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new TypeError(`Unable to resolve file from candidates: ${relativePaths.join(', ')}`);
};

const createAxiosMock = (): AxiosMock => {
	const getCalls: AxiosCall[] = [];
	const postCalls: AxiosCall[] = [];
	let getData: unknown = undefined;
	let postData: unknown = undefined;

	return {
		getCalls,
		postCalls,
		get: async (url, config) => {
			getCalls.push({url, config});
			return {data: getData};
		},
		post: async (url, body, config) => {
			postCalls.push({url, body, config});
			return {data: postData};
		},
		setGetData: (data) => {
			getData = data;
		},
		setPostData: (data) => {
			postData = data;
		},
	};
};

const loadImplementation = async (source: string, axiosMock: AxiosMock): Promise<Record<string, unknown>> => {
	const withoutAxiosImport = source.replace(/^[ \t]*import\s+axios\s+from\s+['"]axios['"];?\s*$/gmu, '');
	const wrappedSource = `const axios = globalThis.__TEST_AXIOS__;\n${withoutAxiosImport}`;
	const transpiled = ts.transpileModule(wrappedSource, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ES2022,
		},
		fileName: 'input.ts',
	});
	const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`;

	globalThis.__TEST_AXIOS__ = axiosMock;
	try {
		const moduleNamespace: unknown = await import(dataUrl);
		if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
			throw new TypeError('Expected imported module namespace object');
		}

		return moduleNamespace as Record<string, unknown>;
	} finally {
		globalThis.__TEST_AXIOS__ = undefined;
	}
};

describe('legacy migrated tests', () => {
	it('enforces strict typing requirements and runtime behaviour', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.match(transformedSource, /export\s+async\s+function\s+get\s*<\s*T\s*>\s*\(/u);
		assert.match(transformedSource, /export\s+async\s+function\s+post\s*<\s*T\s*>\s*\(/u);
		assert.match(transformedSource, /function\s+get\s*<\s*T\s*>[\s\S]*?\)\s*:\s*Promise\s*<\s*T\s*>/u);
		assert.match(transformedSource, /function\s+post\s*<\s*T\s*>[\s\S]*?\)\s*:\s*Promise\s*<\s*T\s*>/u);
		assert.match(transformedSource, /export\s+function\s+parseResponse\s*\(\s*raw\s*:\s*unknown\s*\)/u);
		assert.match(transformedSource, /Array\.isArray\s*\(/u);
		assert.match(transformedSource, /export\s+function\s+buildQueryString\s*\(\s*params\s*:\s*[^)]*(string\s*\|\s*number\s*\|\s*boolean|boolean\s*\|\s*number\s*\|\s*string|number\s*\|\s*boolean\s*\|\s*string)/u);
		assert.doesNotMatch(transformedSource, /\bany\b/u, 'must not contain any');
		assert.doesNotMatch(transformedSource, /\bas\b/u, 'must not contain type casts');
		assert.doesNotMatch(transformedSource, /[\w)\]]!\s*(?:[.(\[])/u, 'must not contain non-null assertions');

		const axiosMock = createAxiosMock();
		axiosMock.setGetData({ok: true, method: 'get'});
		axiosMock.setPostData({ok: true, method: 'post'});
		const implementation = await loadImplementation(transformedSource, axiosMock);

		const configure = implementation.configure;
		const get = implementation.get;
		const post = implementation.post;
		const buildQueryString = implementation.buildQueryString;
		const parseResponse = implementation.parseResponse;

		if (typeof configure !== 'function' || typeof get !== 'function' || typeof post !== 'function' || typeof buildQueryString !== 'function' || typeof parseResponse !== 'function') {
			throw new TypeError('Expected transformed module exports are missing');
		}

		configure({baseURL: 'https://api.example.test', headers: {Authorization: 'Bearer abc'}});
		const getResult = await get('/users', {active: true, page: 2});
		assert.deepStrictEqual(getResult, {ok: true, method: 'get'});
		assert.deepStrictEqual(axiosMock.getCalls[0], {
			url: 'https://api.example.test/users',
			config: {
				params: {active: true, page: 2},
				headers: {Authorization: 'Bearer abc'},
			},
		});

		const postResult = await post('/items', {name: 'Widget'}, {headers: {Trace: 'req-42'}});
		assert.deepStrictEqual(postResult, {ok: true, method: 'post'});
		assert.deepStrictEqual(axiosMock.postCalls[0], {
			url: 'https://api.example.test/items',
			body: {name: 'Widget'},
			config: {
				headers: {
					Authorization: 'Bearer abc',
					Trace: 'req-42',
				},
			},
		});

		assert.strictEqual(buildQueryString({q: 'hello world', page: 3, active: false}), 'q=hello%20world&page=3&active=false');
		assert.strictEqual(buildQueryString({a: 1, skip: undefined, keep: true, alsoSkip: null}), 'a=1&keep=true');

		const parsed = parseResponse({
			data: {
				items: [
					{id: 1, name: 'Primary', title: 'Secondary', meta: {rank: 1}},
					{id: 2, title: 'Only Title'},
					{id: 3},
				],
			},
		});
		assert.deepStrictEqual(parsed, [
			{id: 1, label: 'Primary', meta: {rank: 1}},
			{id: 2, label: 'Only Title', meta: {}},
			{id: 3, label: 'Unknown', meta: {}},
		]);
		assert.deepStrictEqual(parseResponse({data: {items: 'bad'}}), []);
		assert.deepStrictEqual(parseResponse(null), []);
		assert.deepStrictEqual(parseResponse('invalid'), []);
	});
});

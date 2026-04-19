import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

type MockResponse = {
	statusCode: number | undefined;
	jsonPayload: unknown;
	status: (code: number) => MockResponse;
	json: (payload: unknown) => void;
};

const createMockResponse = (): MockResponse => {
	const response: MockResponse = {
		statusCode: undefined,
		jsonPayload: undefined,
		status(code: number): MockResponse {
			response.statusCode = code;
			return response;
		},
		json(payload: unknown): void {
			response.jsonPayload = payload;
		},
	};

	return response;
};

const resolveExistingFileUrl = (relativePaths: readonly string[]): URL => {
	for (const relativePath of relativePaths) {
		const candidate = new URL(relativePath, import.meta.url);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new TypeError(`Unable to resolve file from candidates: ${relativePaths.join(', ')}`);
};

const importJavaScriptModule = async (source: string): Promise<Record<string, unknown>> => {
	const dataUrl = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
	const moduleNamespace: unknown = await import(dataUrl);
	if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
		throw new TypeError('Expected imported module namespace object');
	}

	return moduleNamespace as Record<string, unknown>;
};

describe('legacy migrated tests', () => {
	it('drops module augmentation syntax and preserves requireRole middleware logic', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /declare\s+module\s+['"]express['"]/u);
		assert.doesNotMatch(transformedSource, /import\('express'\)/u);
		assert.doesNotMatch(transformedSource, /:\s*string\b/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const requireRole = implementation.requireRole;
		if (typeof requireRole !== 'function') {
			throw new TypeError('Expected requireRole export to exist');
		}

		const middleware = requireRole('admin');
		if (typeof middleware !== 'function') {
			throw new TypeError('Expected requireRole to return middleware function');
		}

		const deniedResponse = createMockResponse();
		let deniedNextCalled = false;
		middleware({user: {id: 'u-1', roles: ['viewer']}}, deniedResponse, () => {
			deniedNextCalled = true;
		});

		assert.strictEqual(deniedResponse.statusCode, 403);
		assert.deepStrictEqual(deniedResponse.jsonPayload, {error: 'Forbidden'});
		assert.strictEqual(deniedNextCalled, false);

		const allowedResponse = createMockResponse();
		let allowedNextCalled = false;
		middleware({user: {id: 'u-2', roles: ['admin', 'viewer']}}, allowedResponse, () => {
			allowedNextCalled = true;
		});

		assert.strictEqual(allowedResponse.statusCode, undefined);
		assert.strictEqual(allowedResponse.jsonPayload, undefined);
		assert.strictEqual(allowedNextCalled, true);
	});
});

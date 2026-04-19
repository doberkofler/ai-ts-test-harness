import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {describe, it} from 'vitest';

type SchemaLike = {
	parse: (input: unknown) => unknown;
	optional: () => SchemaLike;
	nullable: () => SchemaLike;
};

const isSchemaLike = (value: unknown): value is SchemaLike => {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return typeof candidate.parse === 'function' && typeof candidate.optional === 'function' && typeof candidate.nullable === 'function';
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
	it('removes generic schema typing and keeps parser combinator behavior', async () => {
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const transformedSource = readFileSync(transformedPath, 'utf8');

		assert.doesNotMatch(transformedSource, /\btype\s+Schema\b/u);
		assert.doesNotMatch(transformedSource, /string\s*\(\)\s*:\s*Schema/u);
		assert.doesNotMatch(transformedSource, /optional\s*<\s*T/u);
		assert.doesNotMatch(transformedSource, /nullable\s*<\s*T/u);

		const implementation = await importJavaScriptModule(transformedSource);
		const string = implementation.string;
		const optional = implementation.optional;
		const nullable = implementation.nullable;
		if (typeof string !== 'function' || typeof optional !== 'function' || typeof nullable !== 'function') {
			throw new TypeError('Expected string/optional/nullable exports to exist');
		}

		const stringSchema = string();
		if (!isSchemaLike(stringSchema)) {
			throw new TypeError('Expected string() to return schema-like object');
		}

		assert.strictEqual(stringSchema.parse('ok'), 'ok');
		assert.throws(() => stringSchema.parse(42), /Expected string/u);

		const optionalSchema = stringSchema.optional();
		if (!isSchemaLike(optionalSchema)) {
			throw new TypeError('Expected optional() to return schema-like object');
		}
		assert.strictEqual(optionalSchema.parse(undefined), undefined);
		assert.strictEqual(optionalSchema.parse('hello'), 'hello');

		const nullableSchema = optionalSchema.nullable();
		if (!isSchemaLike(nullableSchema)) {
			throw new TypeError('Expected nullable() to return schema-like object');
		}
		assert.strictEqual(nullableSchema.parse(null), null);
		assert.strictEqual(nullableSchema.parse(undefined), undefined);
		assert.strictEqual(nullableSchema.parse('world'), 'world');
	});
});

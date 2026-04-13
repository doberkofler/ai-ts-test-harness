import {readdirSync, readFileSync} from 'node:fs';
import {basename, join, relative} from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {z} from 'zod';
import {defineImplementProblem, defineRefactorProblem} from './problem-api.ts';
import {type Problem, type ProblemTests} from './types.ts';

const testsSchema = z.custom<ProblemTests>((value) => (typeof value === 'string' && value.length > 0) || typeof value === 'function', {
	message: 'problems must include tests as a non-empty string or callback',
});

const nonEmptyStringOrStringArraySchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

const implementProblemSchema = z.object({
	name: z.string().min(1),
	kind: z.literal('implement-function').default('implement-function'),
	category: z.string().min(1, 'problems must include a category value'),
	description: nonEmptyStringOrStringArraySchema,
	signature: z.string().min(1),
	solution: nonEmptyStringOrStringArraySchema.optional(),
	tests: testsSchema,
});

const refactorProblemSchema = z.object({
	name: z.string().min(1),
	kind: z.literal('direct-refactor'),
	category: z.string().min(1, 'problems must include a category value'),
	description: nonEmptyStringOrStringArraySchema,
	input: z.string().min(1, 'direct-refactor problems must include an input value'),
	entry: z.string().min(1, 'direct-refactor problems must include an entry value'),
	solution: nonEmptyStringOrStringArraySchema.optional(),
	tests: testsSchema,
});

const problemSchema = z.union([implementProblemSchema, refactorProblemSchema]);

const normalizeCategory = (value: string): string => value.trim().toLowerCase();

const parseNameFromPath = (filePath: string): string => {
	const fileName = basename(filePath);
	if (!fileName.endsWith('.problem.ts')) {
		throw new TypeError(`Invalid problem file path: ${filePath}`);
	}

	const withoutExtension = fileName.slice(0, -'.problem.ts'.length);
	if (withoutExtension.length === 0) {
		throw new TypeError(`Unable to derive problem name from file path: ${filePath}`);
	}

	return withoutExtension;
};

const loadProblemModule = (filePath: string): unknown => {
	const source = readFileSync(filePath, 'utf8');
	const transpiled = ts.transpileModule(source, {
		compilerOptions: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.CommonJS,
		},
		fileName: filePath,
	}).outputText;

	const localRequire = (specifier: string): unknown => {
		if (specifier === '#problem-api') {
			return {defineImplementProblem, defineRefactorProblem};
		}

		throw new TypeError(`Unsupported import "${specifier}" in ${filePath}. Use '#problem-api'.`);
	};

	const moduleLike: {exports: Record<string, unknown>} = {exports: {}};
	vm.runInNewContext(transpiled, {
		module: moduleLike,
		exports: moduleLike.exports,
		require: localRequire,
	});

	return moduleLike.exports['default'];
};

const collectProblemFiles = (rootDir: string): string[] => {
	const allFiles: string[] = [];
	const walk = (currentDir: string): void => {
		const entries = readdirSync(currentDir, {withFileTypes: true}).sort((left, right) => left.name.localeCompare(right.name));
		for (const entry of entries) {
			const absolutePath = join(currentDir, entry.name);
			if (entry.isDirectory()) {
				walk(absolutePath);
				continue;
			}

			if (entry.isFile() && entry.name.endsWith('.problem.ts')) {
				allFiles.push(absolutePath);
			}
		}
	};

	walk(rootDir);
	return allFiles.sort((leftPath, rightPath) => relative(rootDir, leftPath).localeCompare(relative(rootDir, rightPath)));
};

const parseProblemModule = (filePath: string): Problem => {
	const exported = loadProblemModule(filePath);
	const parsed = problemSchema.parse(exported);
	const nameFromFile = parseNameFromPath(filePath);

	if (parsed.name !== nameFromFile) {
		throw new TypeError(`Problem name mismatch in ${filePath}: expected "${nameFromFile}" but received "${parsed.name}"`);
	}

	if (parsed.kind === 'direct-refactor') {
		const {solution, ...rest} = parsed;
		return {
			...rest,
			category: normalizeCategory(parsed.category),
			...(typeof solution === 'undefined' ? {} : {solution}),
		};
	}

	const {solution, ...rest} = parsed;

	return {
		...rest,
		category: normalizeCategory(parsed.category),
		...(typeof solution === 'undefined' ? {} : {solution}),
	};
};

export const loadProblems = (dir: string): Problem[] => collectProblemFiles(dir).map((filePath) => parseProblemModule(filePath));

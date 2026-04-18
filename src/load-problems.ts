import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {basename, dirname, join, relative, sep} from 'node:path';
import {z} from 'zod';
import {type ChangedFilesArtifact, type Problem, type WorkspaceFile} from './types.ts';

const problemMetadataSchema = z
	.object({
		version: z.number().int().positive(),
		description: z.string().min(1),
		timeout_ms: z.number().int().positive(),
	})
	.strict();

const normalizePath = (value: string): string => value.split(sep).join('/');

const normalizeCategory = (value: string): string => value.trim().toLowerCase();

const collectFilesRecursively = (rootDir: string): string[] => {
	const allFiles: string[] = [];
	const walk = (currentDir: string): void => {
		const entries = readdirSync(currentDir, {withFileTypes: true}).sort((left, right) => left.name.localeCompare(right.name));
		for (const entry of entries) {
			const absolutePath = join(currentDir, entry.name);
			if (entry.isDirectory()) {
				walk(absolutePath);
				continue;
			}

			if (entry.isFile()) {
				allFiles.push(absolutePath);
			}
		}
	};

	walk(rootDir);
	return allFiles.sort((leftPath, rightPath) => normalizePath(relative(rootDir, leftPath)).localeCompare(normalizePath(relative(rootDir, rightPath))));
};

const loadWorkspaceFiles = (rootDir: string): WorkspaceFile[] => {
	if (!existsSync(rootDir) || !statSync(rootDir).isDirectory()) {
		throw new TypeError(`Missing required directory: ${rootDir}`);
	}

	return collectFilesRecursively(rootDir).map((filePath) => ({
		path: normalizePath(relative(rootDir, filePath)),
		content: readFileSync(filePath, 'utf8'),
	}));
};

const loadOptionalSolution = (problemDir: string): ChangedFilesArtifact | undefined => {
	const solutionDir = join(problemDir, 'solution');
	if (!existsSync(solutionDir) || !statSync(solutionDir).isDirectory()) {
		return undefined;
	}

	return {
		kind: 'changed-files-v1',
		files: loadWorkspaceFiles(solutionDir),
	};
};

const parseProblemFromPath = (rootDir: string, metadataFilePath: string): Problem => {
	const problemDir = dirname(metadataFilePath);
	const slug = basename(problemDir);
	if (slug.length === 0) {
		throw new TypeError(`Unable to derive problem name from path: ${metadataFilePath}`);
	}

	const relativeProblemDir = normalizePath(relative(rootDir, problemDir));
	const categoryFromPath = normalizeCategory(normalizePath(dirname(relativeProblemDir)));
	if (categoryFromPath === '.' || categoryFromPath.length === 0) {
		throw new TypeError(`Problem directory must be nested under a category: ${problemDir}`);
	}

	const metadataRaw = readFileSync(metadataFilePath, 'utf8');
	const metadataUnknown: unknown = JSON.parse(metadataRaw);
	const metadata = problemMetadataSchema.parse(metadataUnknown);

	const solution = loadOptionalSolution(problemDir);

	return {
		name: slug,
		category: categoryFromPath,
		description: metadata.description,
		timeout_ms: metadata.timeout_ms,
		files: loadWorkspaceFiles(join(problemDir, 'files')),
		tests: loadWorkspaceFiles(join(problemDir, 'tests')),
		...(typeof solution === 'undefined' ? {} : {solution}),
	};
};

const collectProblemMetadataFiles = (rootDir: string): string[] =>
	collectFilesRecursively(rootDir)
		.filter((filePath) => basename(filePath) === 'problem.json')
		.sort((leftPath, rightPath) => normalizePath(relative(rootDir, leftPath)).localeCompare(normalizePath(relative(rootDir, rightPath))));

export const loadProblems = (dir: string): Problem[] => collectProblemMetadataFiles(dir).map((path) => parseProblemFromPath(dir, path));

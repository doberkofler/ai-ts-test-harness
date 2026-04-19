import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, extname, join, normalize, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const toPosixPath = (value: string): string => value.split(sep).join('/');

const collectTypeScriptFiles = (rootDir: string): string[] => {
	const files: string[] = [];

	const visit = (dir: string): void => {
		for (const entry of readdirSync(dir, {withFileTypes: true})) {
			const absolutePath = join(dir, entry.name);
			if (entry.isDirectory()) {
				visit(absolutePath);
				continue;
			}

			if (entry.isFile() && extname(entry.name) === '.ts') {
				files.push(absolutePath);
			}
		}
	};

	visit(rootDir);
	return files.sort((left, right) => left.localeCompare(right));
};

const IMPORT_REGEX = /^\s*import\s+(?:[^'"\n]+\s+from\s+)?['"]([^'"\n]+)['"];?/gm;

const extractRelativeImportSpecifiers = (sourceCode: string): string[] => {
	const imports: string[] = [];
	for (const match of sourceCode.matchAll(IMPORT_REGEX)) {
		const specifier = match[1];
		if (typeof specifier === 'string' && specifier.startsWith('.')) {
			imports.push(specifier);
		}
	}

	return imports;
};

const resolveImportToFile = (fromFile: string, specifier: string): string | null => {
	const basePath = resolve(dirname(fromFile), specifier);
	const candidates = [
		basePath,
		`${basePath}.ts`,
		join(basePath, 'index.ts'),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate) && statSync(candidate).isFile() && extname(candidate) === '.ts') {
			return normalize(candidate);
		}
	}

	return null;
};

const canonicalCycleKey = (cycle: readonly string[]): string => {
	if (cycle.length < 2) {
		return cycle.join('|');
	}

	const loop = cycle.slice(0, -1);
	if (loop.length === 0) {
		return '';
	}

	let best = '';
	for (let index = 0; index < loop.length; index += 1) {
		const rotated = [...loop.slice(index), ...loop.slice(0, index)].join('|');
		if (best === '' || rotated < best) {
			best = rotated;
		}
	}

	return best;
};

export function detectCycles(rootDir: string): string[][] {
	const rootPath = resolve(rootDir);
	if (!existsSync(rootPath) || !statSync(rootPath).isDirectory()) {
		throw new TypeError(`Root directory does not exist: ${rootDir}`);
	}

	const allFiles = collectTypeScriptFiles(rootPath);
	const knownFiles = new Set(allFiles);
	const graph = new Map<string, string[]>();

	for (const filePath of allFiles) {
		const code = readFileSync(filePath, 'utf8');
		const edges = new Set<string>();
		for (const specifier of extractRelativeImportSpecifiers(code)) {
			const resolved = resolveImportToFile(filePath, specifier);
			if (resolved && knownFiles.has(resolved)) {
				edges.add(resolved);
			}
		}

		graph.set(filePath, [...edges].sort((left, right) => left.localeCompare(right)));
	}

	const visited = new Set<string>();
	const inStack = new Set<string>();
	const stack: string[] = [];
	const cycles: string[][] = [];
	const cycleKeys = new Set<string>();

	const dfs = (node: string): void => {
		visited.add(node);
		inStack.add(node);
		stack.push(node);

		for (const neighbor of graph.get(node) ?? []) {
			if (!visited.has(neighbor)) {
				dfs(neighbor);
				continue;
			}

			if (!inStack.has(neighbor)) {
				continue;
			}

			const cycleStart = stack.indexOf(neighbor);
			if (cycleStart < 0) {
				continue;
			}

			const cycle = [...stack.slice(cycleStart), neighbor];
			const printableCycle = cycle.map((filePath) => toPosixPath(relative(process.cwd(), filePath)));
			const key = canonicalCycleKey(printableCycle);
			if (!cycleKeys.has(key)) {
				cycleKeys.add(key);
				cycles.push(printableCycle);
			}
		}

		stack.pop();
		inStack.delete(node);
	};

	for (const node of allFiles) {
		if (!visited.has(node)) {
			dfs(node);
		}
	}

	return cycles.sort((left, right) => canonicalCycleKey(left).localeCompare(canonicalCycleKey(right)));
}

export function runCli(args: readonly string[]): number {
	const [rootDir] = args;
	if (typeof rootDir !== 'string' || rootDir.trim().length === 0) {
		console.error('Usage: detect-cycles <root-directory>');
		return 1;
	}

	const cycles = detectCycles(rootDir);
	if (cycles.length === 0) {
		return 0;
	}

	for (const cycle of cycles) {
		console.log(`Cycle: ${cycle.join(' -> ')}`);
	}

	return 1;
}

const isMainModule = (): boolean => {
	const executedPath = process.argv[1];
	if (typeof executedPath !== 'string' || executedPath.length === 0) {
		return false;
	}

	return import.meta.url === pathToFileURL(resolve(executedPath)).href;
};

if (isMainModule()) {
	process.exitCode = runCli(process.argv.slice(2));
}

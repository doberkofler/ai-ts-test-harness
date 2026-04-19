import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {describe, it} from 'vitest';

type DetectCyclesApi = {
	detectCycles: (rootDir: string) => string[][];
	runCli: (args: readonly string[]) => number;
};

const loadImplementation = async (): Promise<DetectCyclesApi> => {
	const candidates = ['./detect-cycles.ts', '../detect-cycles.ts', '../files/detect-cycles.ts'];
	let moduleUrl: URL | undefined;
	for (const candidate of candidates) {
		const candidateUrl = new URL(candidate, import.meta.url);
		if (existsSync(candidateUrl)) {
			moduleUrl = candidateUrl;
			break;
		}
	}

	if (typeof moduleUrl === 'undefined') {
		throw new TypeError(`Unable to resolve implementation from: ${candidates.join(', ')}`);
	}

	const moduleNamespace: unknown = await import(moduleUrl.href);
	if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
		throw new TypeError('Expected imported module namespace object');
	}

	const candidate = moduleNamespace as Record<string, unknown>;
	const detectCycles = candidate.detectCycles;
	const runCli = candidate.runCli;
	if (typeof detectCycles !== 'function') {
		throw new TypeError('Expected export detectCycles to be a function');
	}

	if (typeof runCli !== 'function') {
		throw new TypeError('Expected export runCli to be a function');
	}

	return {
		detectCycles: detectCycles as (rootDir: string) => string[][],
		runCli: runCli as (args: readonly string[]) => number,
	};
};

const writeFile = (baseDir: string, relativePath: string, content: string): void => {
	const fullPath = join(baseDir, relativePath);
	mkdirSync(dirname(fullPath), {recursive: true});
	writeFileSync(fullPath, content, 'utf8');
};

describe('circular dependency detection in TypeScript files', () => {
	it('detects multiple distinct cycles and returns failing exit code', async () => {
		const {detectCycles, runCli} = await loadImplementation();
		const workspace = mkdtempSync(join(tmpdir(), 'cycle-detect-'));
		const previousCwd = process.cwd();

		try {
			writeFile(workspace, 'src/a.ts', "import './b';\nimport './c';\n");
			writeFile(workspace, 'src/b.ts', "import './d';\n");
			writeFile(workspace, 'src/c.ts', "import './d';\nimport './e';\n");
			writeFile(workspace, 'src/d.ts', "import './a';\n");
			writeFile(workspace, 'src/e.ts', "import './c';\n");

			process.chdir(workspace);
			const cycles = detectCycles('src');
			const normalized = cycles
				.map((cycle) => cycle.join(' -> '))
				.sort((left, right) => left.localeCompare(right));

			assert.deepStrictEqual(normalized, ['src/a.ts -> src/b.ts -> src/d.ts -> src/a.ts', 'src/c.ts -> src/e.ts -> src/c.ts']);
			assert.strictEqual(runCli(['src']), 1);
		} finally {
			process.chdir(previousCwd);
			rmSync(workspace, {recursive: true, force: true});
		}
	});

	it('returns no cycles and successful exit code', async () => {
		const {detectCycles, runCli} = await loadImplementation();
		const workspace = mkdtempSync(join(tmpdir(), 'cycle-none-'));
		const previousCwd = process.cwd();

		try {
			writeFile(workspace, 'src/index.ts', "import './utils/math';\n");
			writeFile(workspace, 'src/utils/math.ts', 'export const add = (a: number, b: number): number => a + b;\n');

			process.chdir(workspace);
			assert.deepStrictEqual(detectCycles('src'), []);
			assert.strictEqual(runCli(['src']), 0);
		} finally {
			process.chdir(previousCwd);
			rmSync(workspace, {recursive: true, force: true});
		}
	});
});

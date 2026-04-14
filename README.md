# ai-ts-test-harness

A CLI test harness for evaluating local LLM code generation on TypeScript problems.

[![npm version](https://img.shields.io/npm/v/ai-ts-test-harness.svg)](https://www.npmjs.com/package/ai-ts-test-harness)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/doberkofler/ai-ts-test-harness/actions/workflows/node.js.yml/badge.svg)](https://github.com/doberkofler/ai-ts-test-harness/actions/workflows/node.js.yml)
[![Coverage Status](https://coveralls.io/repos/github/doberkofler/ai-ts-test-harness/badge.svg?branch=main)](https://coveralls.io/github/doberkofler/ai-ts-test-harness?branch=main)

## Usage

Run the harness against all built-in problems:

```bash
pnpm run run
```

When you run the CLI without an explicit command, it now executes `validate`, `run`, and `report` in sequence.

Or run the built binary directly:

```bash
node dist/index.js --model gemma4:31b-it-q4_K_M
```

### CLI Options

- `--model <model>`: Model name to use via the local Ollama-compatible endpoint.
- `--ollama-url <url>`: Ollama-compatible API base URL. Default: `http://localhost:11434/v1`.
- `--debug`: Print the full LLM request and raw response for each problem.
- `--llm-timeout <seconds>`: Timeout for each LLM response in seconds. Default: `120` (2 minutes).
- `--output <file>`: JSON file path for saving run results. Default: `results.json`.
- `--html-output <file>`: Optional HTML report path. If omitted, the CLI writes one next to `--output` using the same filename and `.html` extension.
- `--test <name>`: Run only one specific problem by exact name (for example, `--test=fizzbuzz`).
- `--category <list>`: Run only problems in the listed categories (comma-separated, for example, `--category=algorithms,refactor`).

### CLI Commands

- `validate`: Validates problem definitions by executing each problem's optional `solution` (if present) and confirming tests reject an intentionally invalid solution.
- `run`: Queries the configured model and runs generated answers against tests.
- `report`: Generates reports from an existing JSON results file.

When the harness starts, it prints the effective CLI parameters (`model`, `debug`, `llmTimeoutSecs`, `ollamaUrl`) so you can verify runtime settings immediately.

After each run, the CLI saves both JSON and HTML reports, and prints a clickable `file://...` link for the HTML report so you can open it directly from your terminal.

### Available Scripts

- `pnpm run build`: Builds the CLI for production.
- `pnpm run test`: Runs unit tests using **Vitest**.
- `pnpm run lint`: Lints and formats the codebase using **oxlint** and **oxfmt**.
- `pnpm run ci`: Full CI pipeline (lint, build, test).
- `pnpm run run`: Builds and executes the CLI harness.

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Build the project**:
   ```bash
   pnpm run build
   ```
3. **Run tests**:
   ```bash
   pnpm run test
   pnpm run ci
   ```

## Problem Definitions

Problems are defined as typed TypeScript modules in `src/problems/`.

### Directory Layout

- Files are discovered recursively under `src/problems`.
- Use category folders to group problems (for example `src/problems/refactor`, `src/problems/algorithms`).
- Use descriptive file names without numeric prefixes.
- File extension must be `.problem.ts`.

Example layout:

```text
src/problems/
  algorithms/
    fibonacci.problem.ts
  refactor/
    declaration-to-expression.problem.ts
    for-loop-to-for-of.problem.ts
```

### Load Order

Problems are executed in ascending alphabetical order by relative path under `src/problems`.

### Naming Rules

- The problem `name` is derived from the filename (without `.problem.ts`).
- The exported `name` value must match the filename exactly.
- Example: `src/problems/logic/fizzbuzz.problem.ts` -> `name: 'fizzbuzz'`.

### Module Shape

Each file exports a default problem definition. Two kinds are supported:

- `implement-function`
- `direct-refactor`

Shared required fields:

- `name: string`
- `category: string` (normalized to lowercase)
- `description: string | string[]`
- `tests: (context) => void | Promise<void>`

`implement-function` adds:

- `signature: string`
- `solution?: (...args) => unknown`

`direct-refactor` adds:

- `input: string`
- `entry: string` (function identifier used for behavior checks)
- `solution?: (input: string) => string`

### Authoring Template: `implement-function`

```ts
import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
  name: 'add',
  category: 'arithmetic',
  description: 'Return the sum of two numbers.',
  solution: function add(a: number, b: number): number {
    return a + b;
  },
  signature: 'function add(a: number, b: number): number',
	 tests: ({assert, implementation}) => {
	 	const add = implementation as (a: number, b: number) => number;
	 	assert.strictEqual(add(1, 2), 3);
	 	assert.strictEqual(add(-1, 1), 0);
	 },
});
```

### Authoring Template: `direct-refactor`

```ts
import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
  name: 'declaration-to-expression',
  category: 'refactor',
  description: ['Convert function declaration to const arrow function.'],
  solution: (source) =>
    source
      .replace('function multiply', 'const multiply =')
      .replace('): number {', '): number => {'),
  input: [
    'function multiply(a: number, b: number): number {',
    '\treturn a * b;',
    '}',
  ].join('\n'),
  entry: 'multiply',
	 tests: ({assert, original, transformed, code}) => {
	 	const transformedMultiply = transformed as (a: number, b: number) => number;
	 	const originalMultiply = original as (a: number, b: number) => number;
	 	assert.strictEqual(transformedMultiply(3, 4), originalMultiply(3, 4));
	 	assert.match(code.result, /const\s+multiply\s*=/);
	 	assert.doesNotMatch(code.result, /function\s+multiply\s*\(/);
	 },
});
```

In `direct-refactor` tests, the harness injects:

- `original`: extracted function from `input` (using `entry`)
- `transformed`: extracted function from generated refactor
- `code.input`: original source string
- `code.result`: transformed source string

### Tests Callback

`tests` is always a callback for editor support and linting:

```ts
import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'fibonacci',
	category: 'algorithms',
	description: ['Return nth fibonacci number'],
	signature: 'function fibonacci(n: number): number',
	tests: ({assert, implementation}) => {
		const fibonacciFn = implementation as (n: number) => number;
		assert.strictEqual(fibonacciFn(10), 55);
	},
});
```

Callback context:

- implement-function: `assert`, `implementation`, `code.result`
- direct-refactor: `assert`, `original`, `transformed`, `code.input`, `code.result`

## Tooling

- **Vite 8**: Fast TypeScript build pipeline for the CLI.
- **Vitest**: Unit testing framework.
- **oxlint**: Extremely fast JavaScript/TypeScript linter.
- **oxfmt**: High performance JavaScript / TypeScript formatter.
- **Husky & Commitlint**: Ensuring high-quality commit messages.
- **Conventional Changelog**: Automated changelog generation.

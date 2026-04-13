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

Or run the built binary directly:

```bash
node dist/index.js --model gemma4:31b-it-q4_K_M
```

### CLI Options

- `--model <model>`: Model name to use via the local Ollama-compatible endpoint.
- `--ollama-url <url>`: Ollama-compatible API base URL. Default: `http://localhost:11434/v1`.
- `--debug`: Print the full LLM request and raw response for each problem.
- `--llm-timeout-ms <ms>`: Timeout for each LLM response in milliseconds. Default: `300000` (5 minutes).
- `--output <file>`: JSON file path for saving run results. Default: `results.json`.
- `--html-output <file>`: Optional HTML report path. If omitted, the CLI writes one next to `--output` using the same filename and `.html` extension.
- `--test <name>`: Run only one specific problem by exact name (for example, `--test=fizzbuzz`).
- `--category <list>`: Run only problems in the listed categories (comma-separated, for example, `--category=algorithms,refactor`).

When the harness starts, it prints the effective CLI parameters (`model`, `debug`, `llmTimeoutMs`, `ollamaUrl`) so you can verify runtime settings immediately.

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

Problems are defined as one Markdown file per problem in `problems/`.

The parser lives in `src/load-problems.ts` and reads only level-2 headings (`## ...`) as sections.
Section names are matched case-insensitively by lowercasing (for example `## Kind` and `## kind` are equivalent).

### Required File Structure

Each problem file must contain these logical sections:

- `## kind` (optional): `implement-function` or `direct-refactor`; defaults to `implement-function` if omitted.
- `## category` (required): category label used by `--category` filtering and result reports.
- `## description` (required): one or more instruction lines.
- `## tests` (required): Vitest assertions to evaluate the model output.
- `## signature` (required only for `implement-function`): TypeScript function signature.
- `## input` (required only for `direct-refactor`): source code that the model must refactor.

### Parsing Rules (Exact Behavior)

- **Only section content is parsed:** text before the first `## ...` heading is ignored.
- **One value per section name:** if a heading appears multiple times, the last occurrence wins.
- **`description` normalization:**
  - split by newline,
  - trim whitespace,
  - drop empty lines,
  - remove a leading markdown bullet marker (`- ` or `* `) when present.
- **`category` normalization:** trimmed and lowercased before validation and storage.
- **Code fences are optional for `signature`, `input`, and `tests`:**
  - if wrapped in triple backticks, the outer fence is removed,
  - optional fence language is ignored,
  - inner content is trimmed.
- **Problem name is derived from the filename:**
  - file extension `.md` is removed,
  - any leading numeric prefix plus separators is removed (`^\d+[-_\s]*`),
  - result becomes the problem `name`.
  - Example: `001-add.md` -> `add`, `010 toNumber.md` -> `toNumber`.

### Authoring Template: `implement-function`

````md
## kind
implement-function

## category
arithmetic

## description
- Write a pure function.
- Handle edge cases listed in tests.

## signature
```ts
export function add(a: number, b: number): number;
```

## tests
```ts
import {describe, expect, it} from 'vitest';

describe('add', () => {
	it('adds two numbers', () => {
		expect(add(1, 2)).toBe(3);
	});
});
```
````

### Authoring Template: `direct-refactor`

````md
## kind
direct-refactor

## category
refactor

## description
- Refactor the code to use `for...of`.
- Preserve behavior.

## input
```ts
export function sum(values: number[]): number {
	let total = 0;
	for (let i = 0; i < values.length; i++) {
		total += values[i]!;
	}
	return total;
}
```

## tests
```ts
import {describe, expect, it} from 'vitest';

describe('sum refactor', () => {
	it('preserves behavior', () => {
		expect(sum([1, 2, 3])).toBe(6);
	});

	it('uses for...of', () => {
		expect(transformedCode).toMatch(/for\s*\(\s*const\s+\w+\s+of\s+/);
	});
});
```
````

For `direct-refactor` tests, prefer semantic checks over full-text output comparisons:

- Verify behavior still works on representative inputs.
- Verify only required structural transformations.
- Avoid strict full-output equality assertions that fail on harmless formatting differences.

## Tooling

- **Vite 8**: Fast TypeScript build pipeline for the CLI.
- **Vitest**: Unit testing framework.
- **oxlint**: Extremely fast JavaScript/TypeScript linter.
- **oxfmt**: High performance JavaScript / TypeScript formatter.
- **Husky & Commitlint**: Ensuring high-quality commit messages.
- **Conventional Changelog**: Automated changelog generation.

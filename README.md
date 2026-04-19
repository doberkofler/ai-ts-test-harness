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
- `--no-store-thinking`: Do not store model reasoning/thinking text in saved JSON results.
- `--llm-timeout <seconds>`: Timeout for each LLM response in seconds. Default: `120` (2 minutes).
- `--vitest-timeout <seconds>`: Per-test Vitest timeout in seconds. Default: `60`.
- `--output <file>`: JSON file path for saving run results. Default: `results.json`.
- `--html-output <file>`: Optional HTML report path. If omitted, the CLI writes one next to `--output` using the same filename and `.html` extension.
- `--test <name>`: Run only one specific problem by exact name (for example, `--test=boolean-expression-evaluator`).
- `--category <list>`: Run only problems in the listed categories (comma-separated, for example, `--category=algorithms,refactor`).

### CLI Commands

- `validate`: Validates problem definitions by executing each problem's optional `solution` (if present) and confirming tests reject an intentionally invalid solution.
- `run`: Queries the configured model and runs generated answers against tests.
- `report`: Generates reports from an existing JSON results file.

When the harness starts, it prints the effective CLI parameters (`model`, `debug`, `llmTimeoutSecs`, `vitestTimeoutSecs`, `ollamaUrl`) so you can verify runtime settings immediately.

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

Problems are workspace folders under `src/problems/`.

### Directory Layout

- Problems are discovered recursively under `src/problems`.
- Category is derived from the relative parent directory.
- Each problem folder is named after the problem slug.

Example layout:

```text
src/problems/
  algorithms/
    fibonacci/
      problem.json
      files/
        solution.ts
      tests/
        problem.test.ts
      solution/
        solution.ts
```

### Required Files

- `problem.json`: metadata (`version`, `description`, optional `llm_timeout`)
- `files/`: starter files used for generation/evaluation
- `tests/`: one or more Vitest files executed in an isolated temp workspace

Optional:

- `solution/`: reference solution artifact used by `pnpm run validate`

### Load Order

Problems are executed in ascending alphabetical order by relative `problem.json` path under `src/problems`.

## Tooling

- **Vite 8**: Fast TypeScript build pipeline for the CLI.
- **Vitest**: Unit testing framework.
- **oxlint**: Extremely fast JavaScript/TypeScript linter.
- **oxfmt**: High performance JavaScript / TypeScript formatter.
- **Husky & Commitlint**: Ensuring high-quality commit messages.
- **Conventional Changelog**: Automated changelog generation.

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

When you run the CLI without an explicit command, it behaves like `run`.

Or run the built binary directly:

```bash
node dist/index.js --model gemma4:31b-it-q4_K_M
```

### CLI Options

- `--model <model>`: Model identifier to run. You can pass a bare model id (uses default connection) or `provider/model`. For `report`, pass `all` to explicitly rebuild reports for every model result file.
- `--debug`: Print the full LLM request and raw response for each problem.
- `--no-store-thinking`: Do not store model reasoning/thinking text in saved JSON results.
- `--compress`: Store JSON results as `.json.gz` (default: `false`, stores plain `.json`).
- `--llm-timeout <seconds>`: Timeout for each LLM response in seconds. Default: `120` (2 minutes).
- `--vitest-timeout <seconds>`: Per-test Vitest timeout in seconds. Default: `60`.
- `--html-output <file>`: Optional HTML report path for single-model reports. If omitted, the CLI writes one next to each selected model result file using the same filename and `.html` extension.
- `--test <name>`: Run only one specific problem by exact name (for example, `--test=boolean-expression-evaluator`).
- `--category <list>`: Run only problems in the listed categories (comma-separated, for example, `--category=algorithms,refactor`).

### CLI Commands

- `login [provider]`: Create or update a provider connection. Supports `ollama` plus PI provider IDs from `@mariozechner/pi-ai` (e.g. `openai`, `openai-codex`, `anthropic`, `github-copilot`, `openrouter`, `google-gemini-cli`, ...).
- `logout <connection>`: Remove a saved connection by id/name/provider.
- `auth list`: List saved connections and show the active default.
- `auth use <connection>`: Set the default connection used for bare model ids.
- `models [search]`: List models available from saved connections (optional filter).
- `validate`: Validates problem definitions by executing each problem's optional `solution` (if present) and confirming tests reject an intentionally invalid solution.
- `run`: Queries the configured model and runs generated answers against tests.
- `rerun-failed`: Re-runs only problems that failed in the previous run for the same model.
- `report`: Rebuilds HTML reports plus `index.html` and `comparison.html`; if `--model` is omitted it rebuilds all models, and with `--model <id>` it rebuilds only that model.

### Authentication and Connections

The CLI is login-centric. Configure connections once, then run with `--model`:

```bash
# local Ollama
ai-ts-test-harness login ollama --url http://localhost:11434/v1

# cloud key-based provider
ai-ts-test-harness login openai --api-key sk-...

# OpenAI Codex subscription OAuth (ChatGPT Plus/Pro)
ai-ts-test-harness login openai-codex --oauth

# openrouter browser oauth (opens browser and saves returned key)
ai-ts-test-harness login openrouter --oauth

# inspect and switch defaults
ai-ts-test-harness auth list
ai-ts-test-harness auth use ollama
```

Notes:
- `openai-codex` uses browser OAuth (`--oauth`) for ChatGPT Plus/Pro subscription auth.
- OAuth-capable providers from PI are shown automatically when using `login --oauth`.
- `openrouter` supports browser-based OAuth (`--oauth`) or API keys.
- `openai` currently uses API keys (`--api-key`).

Then run:

```bash
ai-ts-test-harness run --model gemma4:26b-a4b-it-q8_0
# or explicit provider/model
ai-ts-test-harness run --model openai/gpt-4.1-mini
```

Result files are written to the `results/` directory using the model name as the filename (`<model>.json` by default, or `<model>.json.gz` with `--compress`).

When the harness starts, it prints resolved runtime settings (`model`, provider, connection, endpoint, auth mode, timeout values, and filters) so you can verify exactly what will run.

After each run, the CLI saves JSON results, rebuilds HTML reports for each latest model result set, and updates `results/index.html` plus `results/comparison.html`.

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

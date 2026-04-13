import {Command} from 'commander';
import {writeFileSync} from 'node:fs';
import {parse, resolve} from 'node:path';
import {DEFAULT_LLM_TIMEOUT_MS, DEFAULT_OLLAMA_URL} from './generate.ts';
import {type Problem, type Result} from './types.ts';
import {loadProblems} from './load-problems.ts';
import {solveProblem} from './solveProblem.ts';

const STYLES = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	green: '\x1b[32m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
	yellow: '\x1b[33m',
} as const;

const styleText = (text: string, style: string): string => (process.stdout.isTTY ? `${style}${text}${STYLES.reset}` : text);

const formatMs = (durationMs: number): string => {
	if (durationMs < 1000) {
		return `${durationMs}ms`;
	}

	return `${(durationMs / 1000).toFixed(2)}s`;
};

export const parseCategoryFilter = (value?: string): string[] | undefined => {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalizedValue = value.trim();
	if (normalizedValue.length === 0) {
		throw new TypeError(`Invalid --category value: ${value}`);
	}

	const categories = normalizedValue.split(',').map((category) => category.trim().toLowerCase());

	if (categories.some((category) => category.length === 0)) {
		throw new TypeError(`Invalid --category value: ${value}`);
	}

	return [...new Set(categories)];
};

export const selectProblemsByFilters = (problems: Problem[], testName?: string, categories?: string[]): Problem[] => {
	let selected = problems;

	if (typeof testName === 'string') {
		const normalizedTestName = testName.trim();
		if (normalizedTestName.length === 0) {
			throw new TypeError(`Invalid --test value: ${testName}`);
		}

		const found = selected.find((problem) => problem.name === normalizedTestName);
		if (typeof found === 'undefined') {
			const availableNames = problems.map((problem) => problem.name).join(', ');
			throw new TypeError(`Unknown --test value: ${normalizedTestName}. Available tests: ${availableNames}`);
		}

		selected = [found];
	}

	if (Array.isArray(categories) && categories.length > 0) {
		const categorySet = new Set(categories);
		selected = selected.filter((problem) => categorySet.has(problem.category));

		if (selected.length === 0) {
			const availableCategories = [...new Set(problems.map((problem) => problem.category))].sort().join(', ');
			throw new TypeError(`No problems matched --category values: ${categories.join(', ')}. Available categories: ${availableCategories}`);
		}
	}

	return selected;
};

export const selectProblems = (problems: Problem[], testName?: string): Problem[] => selectProblemsByFilters(problems, testName);

type RuntimeConfig = {
	model: string;
	debug: boolean;
	timeoutMs: number;
	ollamaUrl: string;
	selectedCategories?: string[];
};

const printRuntimeConfig = (problems: Problem[], config: RuntimeConfig): void => {
	console.log(styleText('AI Test Harness', STYLES.bold));
	console.log(styleText('----------------', STYLES.dim));
	console.log(`Model      : ${styleText(config.model, STYLES.cyan)}`);
	console.log(`Ollama URL : ${config.ollamaUrl}`);
	console.log(`Timeout    : ${config.timeoutMs}ms (${formatMs(config.timeoutMs)})`);
	console.log(`Debug      : ${config.debug ? styleText('enabled', STYLES.yellow) : 'disabled'}`);
	console.log(
		`Categories : ${Array.isArray(config.selectedCategories) && config.selectedCategories.length > 0 ? config.selectedCategories.join(', ') : 'all'}`,
	);
	console.log(`Problems   : ${problems.length}\n`);
};

const printSummary = (results: Result[]): void => {
	const passed = results.filter((r) => r.passed).length;
	const total = results.length;
	const failed = total - passed;
	const rate = total === 0 ? 0 : Math.round((passed / total) * 100);

	console.log(styleText('Results', STYLES.bold));
	console.log(styleText('─'.repeat(64), STYLES.dim));
	for (const r of results) {
		const status = r.passed ? styleText('PASS', STYLES.green) : styleText('FAIL', STYLES.red);
		console.log(`${status}  ${r.problem.padEnd(30)} ${formatMs(r.duration_ms).padStart(8)}`);
		if (!r.passed && typeof r.error === 'string') {
			const firstLine = r.error.split('\n')[0] ?? r.error;
			console.log(`${styleText('      ->', STYLES.dim)} ${firstLine}`);
		}
	}
	console.log(styleText('─'.repeat(64), STYLES.dim));
	console.log(`Pass@1: ${styleText(`${passed}/${total}`, STYLES.bold)} (${rate}%)  Failed: ${failed}\n`);
};

type ResultsFile = {
	generated_at: string;
	model: string;
	ollama_url: string;
	llm_timeout_ms: number;
	debug: boolean;
	selected_categories?: string[];
	total: number;
	passed: number;
	failed: number;
	pass_rate_percent: number;
	results: Result[];
};

const deriveHtmlOutputPath = (jsonOutputPath: string): string => {
	const resolvedJsonOutputPath = resolve(jsonOutputPath);
	const {dir, name} = parse(resolvedJsonOutputPath);
	return resolve(dir, `${name}.html`);
};

const formatIsoToLocal = (iso: string): string => {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) {
		return iso;
	}

	return parsed.toLocaleString();
};

const renderResultsHtml = (payload: ResultsFile): string => {
	const escapedPayload = JSON.stringify(payload)
		.replaceAll('<', String.raw`\u003c`)
		.replaceAll('>', String.raw`\u003e`)
		.replaceAll('&', String.raw`\u0026`);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Test Harness Results</title>
<style>
:root {
	--bg-start: #f4f7fb;
	--bg-end: #e8f2ff;
	--text-main: #0f172a;
	--text-muted: #475569;
	--surface: rgba(255, 255, 255, 0.88);
	--surface-strong: #ffffff;
	--stroke: #d8e0ee;
	--accent: #0369a1;
	--pass: #047857;
	--fail: #b91c1c;
	--warn: #b45309;
}

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	min-height: 100vh;
	font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
	color: var(--text-main);
	background:
		radial-gradient(circle at 8% 14%, rgba(14, 116, 144, 0.14), transparent 40%),
		radial-gradient(circle at 90% 18%, rgba(5, 150, 105, 0.15), transparent 34%),
		linear-gradient(180deg, var(--bg-start), var(--bg-end));
	padding: 24px;
}

.shell {
	max-width: 1100px;
	margin: 0 auto;
	animation: fadeIn 420ms ease-out;
}

.hero {
	background: linear-gradient(130deg, #0f172a, #0b4f75);
	color: #f8fafc;
	border-radius: 22px;
	padding: 24px;
	box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);
	position: relative;
	overflow: hidden;
}

.hero::after {
	content: '';
	position: absolute;
	width: 260px;
	height: 260px;
	border-radius: 999px;
	background: radial-gradient(circle, rgba(125, 211, 252, 0.36), transparent 70%);
	right: -70px;
	top: -80px;
}

h1 {
	margin: 0;
	font-size: clamp(1.5rem, 2.8vw, 2.2rem);
	letter-spacing: -0.02em;
	position: relative;
	z-index: 1;
}

.meta {
	display: flex;
	gap: 14px;
	flex-wrap: wrap;
	margin-top: 10px;
	position: relative;
	z-index: 1;
	font-size: 0.92rem;
	color: #bfdbfe;
}

.cards {
	margin-top: 18px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 12px;
	position: relative;
	z-index: 1;
}

.card {
	background: rgba(255, 255, 255, 0.12);
	backdrop-filter: blur(6px);
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 14px;
	padding: 12px 14px;
	min-width: 0;
	overflow: hidden;
}

.label {
	font-size: 0.78rem;
	color: #dbeafe;
	text-transform: uppercase;
	letter-spacing: 0.08em;
}

.value {
	margin-top: 6px;
	font-size: 1.3rem;
	font-weight: 700;
	letter-spacing: -0.02em;
	overflow-wrap: anywhere;
}

.panel {
	margin-top: 18px;
	background: var(--surface);
	border: 1px solid var(--stroke);
	border-radius: 18px;
	padding: 16px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.toolbar {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	align-items: center;
	margin-bottom: 12px;
}

.segmented {
	display: inline-flex;
	padding: 4px;
	border: 1px solid var(--stroke);
	border-radius: 12px;
	background: #eef4fb;
	gap: 4px;
}

.segmented button {
	border: 0;
	background: transparent;
	padding: 7px 10px;
	border-radius: 9px;
	cursor: pointer;
	font-weight: 600;
	color: var(--text-muted);
}

.segmented button.active {
	background: var(--surface-strong);
	color: var(--text-main);
	box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1);
}

input[type='search'] {
	flex: 1;
	min-width: 220px;
	border-radius: 11px;
	border: 1px solid var(--stroke);
	padding: 10px 12px;
	font: inherit;
	background: var(--surface-strong);
}

table {
	width: 100%;
	border-collapse: collapse;
	background: var(--surface-strong);
	border-radius: 14px;
	overflow: hidden;
}

.table-wrap {
	overflow-x: auto;
	border-radius: 14px;
	border: 1px solid #e7edf7;
}

th, td {
	padding: 11px 12px;
	border-bottom: 1px solid #e7edf7;
	text-align: left;
	vertical-align: top;
}

th {
	font-size: 0.82rem;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: #334155;
	background: #f6f9ff;
}

tbody tr:hover {
	background: #f8fbff;
}

.badge {
	font-size: 0.78rem;
	font-weight: 700;
	letter-spacing: 0.05em;
	border-radius: 999px;
	padding: 3px 8px;
	display: inline-block;
	color: #fff;
	text-transform: uppercase;
}

.badge.pass {
	background: var(--pass);
}

.badge.fail {
	background: var(--fail);
}

.error {
	white-space: pre-wrap;
	font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
	font-size: 0.78rem;
	color: #7f1d1d;
	background: #fff6f6;
	border: 1px solid #fecaca;
	padding: 8px;
	border-radius: 9px;
	max-width: 100%;
	overflow-wrap: anywhere;
	max-height: 320px;
	overflow: auto;
}

.details-actions {
	white-space: nowrap;
}

.details-open {
	border: 1px solid var(--stroke);
	border-radius: 8px;
	padding: 5px 10px;
	background: #f8fbff;
	color: #0f172a;
	font-weight: 600;
	cursor: pointer;
}

.details-open:hover {
	background: #eef5ff;
}

.drilldown-row td {
	background: #f9fbff;
	padding: 0;
}

.drilldown-content {
	padding: 12px;
	border-top: 1px solid #dce7f8;
}

.drilldown-meta {
	margin-bottom: 8px;
	color: var(--text-muted);
	font-size: 0.9rem;
}

.empty {
	padding: 18px;
	text-align: center;
	color: var(--text-muted);
	font-weight: 600;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(8px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (max-width: 700px) {
	body {
		padding: 14px;
	}

	.hero {
		padding: 18px;
	}

	th:nth-child(5),
	td:nth-child(5) {
		text-align: right;
	}
}
</style>
</head>
<body>
<main class="shell">
	<section class="hero">
		<h1>AI Test Harness Results</h1>
		<div class="meta">
			<span>Generated: ${formatIsoToLocal(payload.generated_at)}</span>
			<span>Model: ${payload.model}</span>
			<span>Categories: ${Array.isArray(payload.selected_categories) && payload.selected_categories.length > 0 ? payload.selected_categories.join(', ') : 'all'}</span>
			<span>Timeout: ${payload.llm_timeout_ms}ms</span>
		</div>
		<div class="cards">
			<div class="card"><div class="label">Pass Rate</div><div class="value">${payload.pass_rate_percent}%</div></div>
			<div class="card"><div class="label">Passed</div><div class="value">${payload.passed}</div></div>
			<div class="card"><div class="label">Failed</div><div class="value">${payload.failed}</div></div>
			<div class="card"><div class="label">Total</div><div class="value">${payload.total}</div></div>
		</div>
	</section>

	<section class="panel">
		<div class="toolbar">
			<div class="segmented" role="tablist" aria-label="Result filter">
				<button type="button" class="active" data-filter="all">All</button>
				<button type="button" data-filter="pass">Pass</button>
				<button type="button" data-filter="fail">Fail</button>
			</div>
			<input id="search" type="search" placeholder="Search by problem or category..." />
		</div>
		<div class="table-wrap">
			<table aria-label="Problem results">
				<thead>
					<tr>
						<th>Status</th>
						<th>Problem</th>
						<th>Category</th>
						<th>Duration</th>
						<th>Details</th>
					</tr>
				</thead>
				<tbody id="results-body"></tbody>
			</table>
		</div>
		<div id="empty-state" class="empty" hidden>No results match this filter.</div>
	</section>
</main>

<script>
const data = ${escapedPayload};
const body = document.getElementById('results-body');
const searchInput = document.getElementById('search');
const emptyState = document.getElementById('empty-state');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
let activeFilter = 'all';
const expandedResultKeys = new Set();

const escapeHtml = (value) => value
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;')
	.replaceAll("'", '&#39;');

const formatDuration = (durationMs) => durationMs < 1000
	? durationMs + 'ms'
	: (durationMs / 1000).toFixed(2) + 's';

const getResultKey = (result) => result.problem + '::' + result.category;

const render = () => {
	const query = searchInput.value.trim().toLowerCase();
	const filtered = data.results.filter((result) => {
		if (activeFilter === 'pass' && !result.passed) {
			return false;
		}

		if (activeFilter === 'fail' && result.passed) {
			return false;
		}

		if (query.length > 0 && !result.problem.toLowerCase().includes(query) && !result.category.toLowerCase().includes(query)) {
			return false;
		}

		return true;
	});

	if (filtered.length === 0) {
		body.innerHTML = '';
		emptyState.hidden = false;
		return;
	}

	emptyState.hidden = true;
	body.innerHTML = filtered
		.map((result) => {
			const resultKey = getResultKey(result);
			const statusClass = result.passed ? 'pass' : 'fail';
			const statusText = result.passed ? 'PASS' : 'FAIL';
			const isExpanded = expandedResultKeys.has(resultKey);
			const actionLabel = isExpanded ? 'Hide details' : 'Show details';
			const detailsRow = isExpanded
				? '<tr class="drilldown-row" data-parent-key="' + escapeHtml(resultKey) + '">'
					+ '<td colspan="5">'
					+ '<div class="drilldown-content">'
					+ '<div class="drilldown-meta">' + statusText + ' • ' + escapeHtml(result.category) + ' • ' + formatDuration(result.duration_ms) + '</div>'
					+ '<div class="error">' + escapeHtml(typeof result.error === 'string' && result.error.length > 0 ? result.error : 'No error output.') + '</div>'
					+ '</div>'
					+ '</td>'
					+ '</tr>'
				: '';

			return '<tr data-key="' + escapeHtml(resultKey) + '" data-expanded="' + (isExpanded ? 'true' : 'false') + '">'
				+ '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>'
				+ '<td>' + escapeHtml(result.problem) + '</td>'
				+ '<td>' + escapeHtml(result.category) + '</td>'
				+ '<td>' + formatDuration(result.duration_ms) + '</td>'
				+ '<td class="details-actions"><button type="button" class="details-open" data-toggle-key="' + escapeHtml(resultKey) + '" aria-expanded="' + (isExpanded ? 'true' : 'false') + '">' + actionLabel + '</button></td>'
				+ '</tr>'
				+ detailsRow;
		})
		.join('');

	for (const trigger of Array.from(document.querySelectorAll('[data-toggle-key]'))) {
		trigger.addEventListener('click', () => {
			const key = trigger.getAttribute('data-toggle-key') ?? '';
			if (key.length === 0) {
				return;
			}

			if (expandedResultKeys.has(key)) {
				expandedResultKeys.delete(key);
			} else {
				expandedResultKeys.add(key);
			}
			render();
		});
	}
};

for (const button of filterButtons) {
	button.addEventListener('click', () => {
		activeFilter = button.dataset.filter ?? 'all';
		for (const item of filterButtons) {
			item.classList.toggle('active', item === button);
		}
		render();
	});
}

searchInput.addEventListener('input', render);
render();
</script>
</body>
</html>
`;
};

export const formatResultsFile = (results: Result[], config: RuntimeConfig): ResultsFile => {
	const passed = results.filter((r) => r.passed).length;
	const total = results.length;

	return {
		generated_at: new Date().toISOString(),
		model: config.model,
		ollama_url: config.ollamaUrl,
		llm_timeout_ms: config.timeoutMs,
		debug: config.debug,
		...(Array.isArray(config.selectedCategories) ? {selected_categories: config.selectedCategories} : {}),
		total,
		passed,
		failed: total - passed,
		pass_rate_percent: total === 0 ? 0 : Math.round((passed / total) * 100),
		results,
	};
};

export const formatResultsHtmlFile = (results: Result[], config: RuntimeConfig): string => {
	const payload = formatResultsFile(results, config);
	return renderResultsHtml(payload);
};

const writeResultsFile = (results: Result[], outputPath: string, config: RuntimeConfig): string => {
	const resolvedOutputPath = resolve(outputPath);
	const payload = formatResultsFile(results, config);
	writeFileSync(resolvedOutputPath, `${JSON.stringify(payload, undefined, 2)}\n`, 'utf8');
	return resolvedOutputPath;
};

const writeResultsHtmlFile = (results: Result[], jsonOutputPath: string, htmlOutputPath: string | undefined, config: RuntimeConfig): string => {
	const resolvedOutputPath = typeof htmlOutputPath === 'string' ? resolve(htmlOutputPath) : deriveHtmlOutputPath(jsonOutputPath);
	const html = formatResultsHtmlFile(results, config);
	writeFileSync(resolvedOutputPath, html, 'utf8');
	return resolvedOutputPath;
};

const main = async (): Promise<void> => {
	const program = new Command();
	program.name('ai-ts-test-harness').description('A TypeScript test harness for AI models');
	program.option('--model <model>', 'Model to use', 'gemma4:31b-it-q4_K_M');
	program.option('--debug', 'Print LLM request/response for each problem', false);
	program.option('--llm-timeout-ms <ms>', 'LLM response timeout in milliseconds', String(DEFAULT_LLM_TIMEOUT_MS));
	program.option('--ollama-url <url>', 'Ollama-compatible API base URL', DEFAULT_OLLAMA_URL);
	program.option('--output <file>', 'Write run results to a JSON file', 'results.json');
	program.option('--html-output <file>', 'Write an HTML report file (defaults to output path with .html extension)');
	program.option('--test <name>', 'Run a specific test by exact problem name');
	program.option('--category <list>', 'Run only categories from a comma-separated list (for example, algorithms,refactor)');
	program.parse();

	const {model, debug, llmTimeoutMs, ollamaUrl, output, htmlOutput, test, category} = program.opts<{
		model: string;
		debug: boolean;
		llmTimeoutMs: string;
		ollamaUrl: string;
		output: string;
		htmlOutput?: string;
		test?: string;
		category?: string;
	}>();

	const timeoutMs = Number.parseInt(llmTimeoutMs, 10);
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new TypeError(`Invalid --llm-timeout-ms value: ${llmTimeoutMs}`);
	}

	if (ollamaUrl.length === 0) {
		throw new TypeError(`Invalid --ollama-url value: ${ollamaUrl}`);
	}

	if (output.length === 0) {
		throw new TypeError(`Invalid --output value: ${output}`);
	}

	if (typeof htmlOutput === 'string' && htmlOutput.length === 0) {
		throw new TypeError(`Invalid --html-output value: ${htmlOutput}`);
	}

	const allProblems = loadProblems('./problems');
	const selectedCategories = parseCategoryFilter(category);
	const problems = selectProblemsByFilters(allProblems, test, selectedCategories);
	const runtimeConfig: RuntimeConfig = {
		model,
		debug,
		timeoutMs,
		ollamaUrl,
		...(Array.isArray(selectedCategories) ? {selectedCategories} : {}),
	};

	printRuntimeConfig(problems, runtimeConfig);

	const results: Result[] = [];

	for (let i = 0; i < problems.length; i++) {
		const problem = problems[i];
		if (problem) {
			const current = `[${String(i + 1).padStart(2, ' ')}/${problems.length}]`;
			console.log(`${styleText(current, STYLES.dim)} ${styleText(problem.name, STYLES.bold)}`);

			// oxlint-disable-next-line no-await-in-loop
			const result = await solveProblem(problem, {model, ollamaUrl, debug, timeoutMs});

			const status = result.passed ? styleText('PASS', STYLES.green) : styleText('FAIL', STYLES.red);
			console.log(`${status} in ${formatMs(result.duration_ms)}\n`);
			results.push(result);
		}
	}

	printSummary(results);
	const outputPath = writeResultsFile(results, output, runtimeConfig);
	const htmlOutputPath = writeResultsHtmlFile(results, outputPath, htmlOutput, runtimeConfig);
	console.log(`Saved JSON results to ${outputPath}`);
	console.log(`Saved HTML report to file://${htmlOutputPath}`);
};

const isEntrypoint = process.argv[1] === import.meta.filename;
if (isEntrypoint) {
	await main();
}

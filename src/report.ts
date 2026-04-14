import {writeFileSync, readFileSync} from 'node:fs';
import {parse, resolve} from 'node:path';
import {z} from 'zod';
import {summarizeResults} from './core/results-summary.ts';
import {type Result, type ResultsFile, type RuntimeConfig} from './types.ts';
import {STYLES, styleText, formatMs, formatIsoToLocal} from './utils.ts';

const resultSchema = z.object({
	problem: z.string(),
	category: z.string(),
	program: z.string(),
	passed: z.boolean(),
	error: z.string().optional(),
	duration_ms: z.number(),
});

const resultsFileSchema = z.object({
	generated_at: z.string(),
	model: z.string(),
	ollama_url: z.string(),
	llm_timeout_secs: z.number(),
	cooldown_period_secs: z.number().optional(),
	debug: z.boolean(),
	selected_categories: z.array(z.string()).optional(),
	total: z.number(),
	passed: z.number(),
	failed: z.number(),
	pass_rate_percent: z.number(),
	results: z.array(resultSchema),
});

export const printSummary = (results: Result[]): void => {
	const summary = summarizeResults(results);

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
	console.log(`Pass@1: ${styleText(`${summary.passed}/${summary.total}`, STYLES.bold)} (${summary.passRatePercent}%)  Failed: ${summary.failed}\n`);
};

export const deriveHtmlOutputPath = (jsonOutputPath: string): string => {
	const resolvedJsonOutputPath = resolve(jsonOutputPath);
	const {dir, name} = parse(resolvedJsonOutputPath);
	return resolve(dir, `${name}.html`);
};

export const renderResultsHtml = (payload: ResultsFile): string => {
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

.program-label {
	font-size: 0.82rem;
	font-weight: 600;
	color: var(--text-muted);
	margin-top: 12px;
	margin-bottom: 6px;
}

.program {
	white-space: pre-wrap;
	font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
	font-size: 0.78rem;
	color: var(--text-main);
	background: #f8fafc;
	border: 1px solid var(--stroke);
	padding: 8px;
	border-radius: 9px;
	max-width: 100%;
	overflow-wrap: anywhere;
	max-height: 400px;
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
			<span>Timeout: ${payload.llm_timeout_secs}s</span>
			<span>Cooldown: ${typeof payload.cooldown_period_secs === 'number' ? payload.cooldown_period_secs : 0}s</span>
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
					+ '<div class="program-label">Generated Program:</div>'
					+ '<div class="program">' + escapeHtml(result.program) + '</div>'
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

export const formatResultsHtmlFile = (results: Result[], config: RuntimeConfig): string => {
	const summary = summarizeResults(results);

	const payload: ResultsFile = {
		generated_at: new Date().toISOString(),
		model: config.model,
		ollama_url: config.ollamaUrl,
		llm_timeout_secs: config.llmTimeoutSecs,
		...(typeof config.cooldownPeriodSecs === 'number' ? {cooldown_period_secs: config.cooldownPeriodSecs} : {}),
		debug: config.debug,
		...(Array.isArray(config.selectedCategories) ? {selected_categories: config.selectedCategories} : {}),
		total: summary.total,
		passed: summary.passed,
		failed: summary.failed,
		pass_rate_percent: summary.passRatePercent,
		results,
	};
	return renderResultsHtml(payload);
};

export const writeResultsHtmlFile = (results: Result[], jsonOutputPath: string, htmlOutputPath: string | undefined, config: RuntimeConfig): string => {
	const resolvedOutputPath = typeof htmlOutputPath === 'string' ? resolve(htmlOutputPath) : deriveHtmlOutputPath(jsonOutputPath);
	const html = formatResultsHtmlFile(results, config);
	writeFileSync(resolvedOutputPath, html, 'utf8');
	return resolvedOutputPath;
};

export const isResultsFile = (data: unknown): data is ResultsFile => resultsFileSchema.safeParse(data).success;

export const parseResultsFile = (jsonContent: string): ResultsFile => {
	const data: unknown = JSON.parse(jsonContent);
	const parsed = resultsFileSchema.parse(data);

	const results: Result[] = parsed.results.map((result) =>
		typeof result.error === 'string'
			? {
					problem: result.problem,
					category: result.category,
					program: result.program,
					passed: result.passed,
					error: result.error,
					duration_ms: result.duration_ms,
				}
			: {
					problem: result.problem,
					category: result.category,
					program: result.program,
					passed: result.passed,
					duration_ms: result.duration_ms,
				},
	);

	return {
		generated_at: parsed.generated_at,
		model: parsed.model,
		ollama_url: parsed.ollama_url,
		llm_timeout_secs: parsed.llm_timeout_secs,
		...(typeof parsed.cooldown_period_secs === 'number' ? {cooldown_period_secs: parsed.cooldown_period_secs} : {}),
		debug: parsed.debug,
		...(Array.isArray(parsed.selected_categories) ? {selected_categories: parsed.selected_categories} : {}),
		total: parsed.total,
		passed: parsed.passed,
		failed: parsed.failed,
		pass_rate_percent: parsed.pass_rate_percent,
		results,
	};
};

export type ReportCommandOptions = {
	output: string;
	htmlOutput: string | undefined;
};

export const reportCommand = (options: ReportCommandOptions): void => {
	const jsonContent = readFileSync(resolve(options.output), 'utf8');
	const data = parseResultsFile(jsonContent);

	const {results} = data;
	printSummary(results);

	const config: RuntimeConfig = {
		model: data.model,
		debug: data.debug,
		llmTimeoutSecs: data.llm_timeout_secs,
		...(typeof data.cooldown_period_secs === 'number' ? {cooldownPeriodSecs: data.cooldown_period_secs} : {}),
		ollamaUrl: data.ollama_url,
		...(Array.isArray(data.selected_categories) ? {selectedCategories: data.selected_categories} : {}),
	};

	writeResultsHtmlFile(results, options.output, options.htmlOutput, config);
	console.log(`Saved HTML report to file://${deriveHtmlOutputPath(options.output)}`);
};

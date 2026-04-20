import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join, parse, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {DEFAULT_RESULTS_DIR} from './config.ts';
import {summarizeResults} from './core/results-summary.ts';
import {type Result, type ResultsFile, type RuntimeConfig} from './types.ts';
import {STYLES, styleText} from './utils.ts';
import {formatMs, formatIsoToLocal} from './core/time-format.ts';
import {type RunReportEntry} from './report-core.ts';
import {writeComparisonHtml} from './report-comparison-html.ts';
import {writeIndexHtml} from './report-index-html.ts';
import {parseResultsFile} from './results-file.ts';

export {isResultsFile, parseResultsFile} from './results-file.ts';

export const printSummary = (results: Result[]): void => {
	const summary = summarizeResults(results);

	console.log(styleText('Results', STYLES.bold));
	console.log(styleText('─'.repeat(64), STYLES.dim));
	for (const r of results) {
		const status = r.passed ? styleText('PASS', STYLES.green) : styleText('FAIL', STYLES.red);
		console.log(`${status}  ${r.problem.padEnd(30)} ${formatMs(r.llm_metrics.llm_duration_ms).padStart(8)}`);
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
	const lowerCased = resolvedJsonOutputPath.toLowerCase();
	const withoutExtension = lowerCased.endsWith('.json.gz')
		? resolvedJsonOutputPath.slice(0, -'.json.gz'.length)
		: lowerCased.endsWith('.json')
			? resolvedJsonOutputPath.slice(0, -'.json'.length)
			: resolvedJsonOutputPath;
	return `${withoutExtension}.html`;
};

export const renderResultsHtml = (payload: ResultsFile): string => {
	const summary = summarizeResults(payload.results);
	const escapedPayload = JSON.stringify(payload)
		.replaceAll('<', String.raw`\u003c`)
		.replaceAll('>', String.raw`\u003e`)
		.replaceAll('&', String.raw`\u0026`);

	const hardwareInfo = payload.system_info
		? `<span>Host: ${payload.system_info.hostname}</span>
		   <span>OS: ${payload.system_info.os}</span>
		   <span>CPU: ${payload.system_info.cpu} (${payload.system_info.ram_gb}GB RAM)</span>
		   ${typeof payload.system_info.gpu === 'string' && payload.system_info.gpu.length > 0 ? `<span>GPU: ${payload.system_info.gpu}</span>` : ''}`
		: '';

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


.detail-tabs {
	display: inline-flex;
	gap: 6px;
	flex-wrap: wrap;
}

.detail-tab {
	width: 30px;
	height: 30px;
	border: 1px solid var(--stroke);
	border-radius: 8px;
	padding: 0;
	background: #f8fbff;
	color: #334155;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
}

.detail-tab:hover {
	background: #eef5ff;
}

.detail-tab.active {
	background: #dbeafe;
	border-color: #93c5fd;
	color: #0f172a;
	box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
}

.detail-tab svg {
	width: 16px;
	height: 16px;
	stroke: currentColor;
	fill: none;
	stroke-width: 1.8;
	stroke-linecap: round;
	stroke-linejoin: round;
	pointer-events: none;
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

.section-title {
	font-size: 0.82rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #0f172a;
	margin-bottom: 8px;
}

.metrics-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 8px;
}

.metric {
	border: 1px solid var(--stroke);
	border-radius: 10px;
	padding: 8px;
	background: #f8fbff;
}

.metric-label {
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: #64748b;
}

.metric-value {
	margin-top: 4px;
	font-size: 0.95rem;
	font-weight: 700;
	color: #0f172a;
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

	.detail-tabs {
		justify-content: flex-end;
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
			<span>Timeout: ${typeof payload.llm_timeout_secs === 'number' ? payload.llm_timeout_secs : 'n/a'}${typeof payload.llm_timeout_secs === 'number' ? 's' : ''}</span>
			${hardwareInfo}
		</div>
		<div class="cards">
			<div class="card"><div class="label">Pass Rate</div><div class="value">${summary.passRatePercent}%</div></div>
			<div class="card"><div class="label">Passed</div><div class="value">${summary.passed}</div></div>
			<div class="card"><div class="label">Failed</div><div class="value">${summary.failed}</div></div>
			<div class="card"><div class="label">Total</div><div class="value">${summary.total}</div></div>
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
const selectedDetailByKey = new Map();

const DETAIL_SECTIONS = Object.freeze({
	details: 'details',
	error: 'error',
	thinking: 'thinking',
	artifacts: 'artifacts',
});

const DETAIL_BUTTONS = [
	{
		section: DETAIL_SECTIONS.details,
		label: 'Details and metrics',
		icon:
			'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="10" x2="12" y2="16"></line><circle cx="12" cy="7" r="1"></circle></svg>',
	},
	{
		section: DETAIL_SECTIONS.error,
		label: 'Error output',
		icon:
			'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12" y2="13"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
	},
	{
		section: DETAIL_SECTIONS.thinking,
		label: 'Model thinking',
		icon:
			'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 17.5c0 1.1.9 2 2 2h1c1.1 0 2-.9 2-2"></path><path d="M9 14c-1.4-1-2.5-2.5-2.5-4.5A5.5 5.5 0 0 1 12 4a5.5 5.5 0 0 1 5.5 5.5c0 2-1.1 3.5-2.5 4.5"></path><line x1="10" y1="14" x2="14" y2="14"></line></svg>',
	},
	{
		section: DETAIL_SECTIONS.artifacts,
		label: 'Generated artifacts',
		icon:
			'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8l3 3v11H5V8z"></path><path d="M8 5v3h8V5"></path><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="16" x2="13" y2="16"></line></svg>',
	},
];

const escapeHtml = (value) => value
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;')
	.replaceAll("'", '&#39;');

const formatDuration = (durationMs) => durationMs < 1000
	? durationMs + 'ms'
	: (durationMs / 1000).toFixed(2) + 's';

const formatMetric = (value, fractionDigits = 0) =>
	Number.isFinite(value)
		? Number(value).toLocaleString(undefined, {
			maximumFractionDigits: fractionDigits,
			minimumFractionDigits: fractionDigits,
		})
		: 'n/a';

const getResultKey = (result) => result.problem + '::' + result.category;

const getSectionTitle = (section) => {
	if (section === DETAIL_SECTIONS.error) {
		return 'Error Output';
	}

	if (section === DETAIL_SECTIONS.thinking) {
		return 'Model Thinking';
	}

	if (section === DETAIL_SECTIONS.artifacts) {
		return 'Generated Artifacts';
	}

	return 'Details and Metrics';
};

const renderMetrics = (metrics) => '<div class="metrics-grid">'
	+ '<div class="metric"><div class="metric-label">Duration</div><div class="metric-value">' + formatDuration(metrics.llm_duration_ms) + '</div></div>'
	+ '<div class="metric"><div class="metric-label">Tokens Sent</div><div class="metric-value">' + formatMetric(metrics.tokens_sent) + '</div></div>'
	+ '<div class="metric"><div class="metric-label">Tokens Received</div><div class="metric-value">' + formatMetric(metrics.tokens_received) + '</div></div>'
	+ '<div class="metric"><div class="metric-label">Avg Tokens/Sec</div><div class="metric-value">' + formatMetric(metrics.average_tokens_per_second, 2) + '</div></div>'
	+ '</div>';

const renderDetailSection = (result, section) => {
	if (section === DETAIL_SECTIONS.error) {
		return '<div class="error">' + escapeHtml(typeof result.error === 'string' && result.error.length > 0 ? result.error : 'No error output.') + '</div>';
	}

	if (section === DETAIL_SECTIONS.thinking) {
		return '<div class="program">'
			+ escapeHtml(typeof result.thinking === 'string' && result.thinking.length > 0 ? result.thinking : 'No model thinking captured.')
			+ '</div>';
	}

	if (section === DETAIL_SECTIONS.artifacts) {
		return renderArtifact(result.artifact, result.program);
	}

	return renderMetrics(result.llm_metrics);
};

const renderArtifact = (artifact, program) => {
	if (!artifact || artifact.kind !== 'changed-files-v1' || !Array.isArray(artifact.files) || artifact.files.length === 0) {
		if (typeof program === 'string' && program.length > 0) {
			return '<div class="program">' + escapeHtml(program) + '</div>';
		}
		return '<div class="program">No artifact output.</div>';
	}

	return artifact.files
		.map((file) => '<div class="program-label">' + escapeHtml(file.path) + ':</div>' + '<div class="program">' + escapeHtml(file.content) + '</div>')
		.join('');
};

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
			const selectedSection = selectedDetailByKey.get(resultKey) ?? DETAIL_SECTIONS.details;
			const sectionTitle = getSectionTitle(selectedSection);
			const tabActions = '<div class="detail-tabs">'
				+ DETAIL_BUTTONS.map((buttonConfig) => {
					const isActive = isExpanded && selectedSection === buttonConfig.section;
					return '<button type="button" class="detail-tab ' + (isActive ? 'active' : '') + '"'
						+ ' data-detail-key="' + escapeHtml(resultKey) + '"'
						+ ' data-detail-section="' + buttonConfig.section + '"'
						+ ' aria-label="' + buttonConfig.label + '"'
						+ ' title="' + buttonConfig.label + '"'
						+ ' aria-pressed="' + (isActive ? 'true' : 'false') + '">'
						+ buttonConfig.icon
						+ '</button>';
				}).join('')
				+ '</div>';
			const detailsRow = isExpanded
				? '<tr class="drilldown-row" data-parent-key="' + escapeHtml(resultKey) + '">'
					+ '<td colspan="5">'
					+ '<div class="drilldown-content">'
					+ '<div class="drilldown-meta">' + statusText + ' • ' + escapeHtml(result.category) + ' • ' + formatDuration(result.llm_metrics.llm_duration_ms) + '</div>'
					+ '<div class="section-title">' + sectionTitle + '</div>'
					+ renderDetailSection(result, selectedSection)
					+ '</div>'
					+ '</td>'
					+ '</tr>'
				: '';

			return '<tr data-key="' + escapeHtml(resultKey) + '" data-expanded="' + (isExpanded ? 'true' : 'false') + '">'
				+ '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>'
				+ '<td>' + escapeHtml(result.problem) + '</td>'
				+ '<td>' + escapeHtml(result.category) + '</td>'
				+ '<td>' + formatDuration(result.llm_metrics.llm_duration_ms) + '</td>'
				+ '<td class="details-actions">' + tabActions + '</td>'
				+ '</tr>'
				+ detailsRow;
		})
		.join('');

	for (const trigger of Array.from(document.querySelectorAll('[data-detail-key]'))) {
		trigger.addEventListener('click', () => {
			const key = trigger.getAttribute('data-detail-key') ?? '';
			const section = trigger.getAttribute('data-detail-section') ?? DETAIL_SECTIONS.details;
			if (key.length === 0) {
				return;
			}

			const currentSection = selectedDetailByKey.get(key) ?? DETAIL_SECTIONS.details;
			if (expandedResultKeys.has(key) && currentSection === section) {
				expandedResultKeys.delete(key);
			} else {
				expandedResultKeys.add(key);
				selectedDetailByKey.set(key, section);
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
	const payload: ResultsFile = {
		generated_at: new Date().toISOString(),
		model: config.model,
		ollama_url: config.ollamaUrl,
		llm_timeout_secs: config.llmTimeoutSecs,
		...(Array.isArray(config.selectedCategories) ? {selected_categories: config.selectedCategories} : {}),
		...(config.systemInfo ? {system_info: config.systemInfo} : {}),
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

export const writeResultsPayloadHtmlFile = (payload: ResultsFile, jsonOutputPath: string, htmlOutputPath: string | undefined): string => {
	const resolvedOutputPath = typeof htmlOutputPath === 'string' ? resolve(htmlOutputPath) : deriveHtmlOutputPath(jsonOutputPath);
	const html = renderResultsHtml(payload);
	writeFileSync(resolvedOutputPath, html, 'utf8');
	return resolvedOutputPath;
};

export type ReportCommandOptions = {
	model: string;
	htmlOutput: string | undefined;
	allModels?: boolean;
};

const toSafeModelName = (model: string): string => model.replaceAll(/[^a-z0-9.-]/gi, '_');

const safeStat = (pathValue: string): ReturnType<typeof statSync> | undefined => {
	try {
		return statSync(pathValue);
	} catch {
		return undefined;
	}
};

const stripResultsExtension = (fileName: string): string | undefined => {
	const lowerCased = fileName.toLowerCase();
	if (lowerCased.endsWith('.json.gz')) {
		return fileName.slice(0, -'.json.gz'.length);
	}

	if (lowerCased.endsWith('.json')) {
		return fileName.slice(0, -'.json'.length);
	}

	return undefined;
};

const collectLatestJsonFilesForModel = (model: string): string[] => {
	const outputDir = resolve(DEFAULT_RESULTS_DIR);
	const baseName = toSafeModelName(model);
	const jsonPath = resolve(join(outputDir, `${baseName}.json`));
	const gzPath = `${jsonPath}.gz`;
	const candidates = [jsonPath, gzPath]
		.map((path) => ({path, stats: safeStat(path)}))
		.filter((candidate): candidate is {path: string; stats: NonNullable<ReturnType<typeof safeStat>>} => {
			const {stats} = candidate;
			if (typeof stats === 'undefined') {
				return false;
			}
			return stats.isFile();
		})
		.sort((left, right) => Number(right.stats.mtimeMs) - Number(left.stats.mtimeMs));

	const [latest] = candidates;
	if (typeof latest === 'undefined') {
		throw new TypeError(`No .json/.json.gz result file found for model ${model} in ${outputDir}`);
	}

	return [latest.path];
};

const collectLatestJsonFilesForAllModels = (): string[] => {
	const outputDir = resolve(DEFAULT_RESULTS_DIR);
	const directoryStats = safeStat(outputDir);
	if (typeof directoryStats === 'undefined' || !directoryStats.isDirectory()) {
		throw new TypeError(`No results directory found at ${outputDir}`);
	}

	type Candidate = {
		modelKey: string;
		path: string;
		stats: NonNullable<ReturnType<typeof safeStat>>;
	};

	const latestByModel = new Map<string, Candidate>();
	for (const directoryEntry of readdirSync(outputDir, {withFileTypes: true})) {
		if (!directoryEntry.isFile()) {
			continue;
		}

		const modelKey = stripResultsExtension(directoryEntry.name);
		if (typeof modelKey !== 'string' || modelKey.length === 0) {
			continue;
		}

		const pathValue = resolve(join(outputDir, directoryEntry.name));
		const stats = safeStat(pathValue);
		if (typeof stats === 'undefined' || !stats.isFile()) {
			continue;
		}

		const candidate: Candidate = {modelKey, path: pathValue, stats};
		const existing = latestByModel.get(modelKey);
		if (typeof existing === 'undefined' || Number(candidate.stats.mtimeMs) > Number(existing.stats.mtimeMs)) {
			latestByModel.set(modelKey, candidate);
		}
	}

	const latestFiles = [...latestByModel.values()].sort((left, right) => Number(right.stats.mtimeMs) - Number(left.stats.mtimeMs));
	if (latestFiles.length === 0) {
		throw new TypeError(`No .json/.json.gz result files found in ${outputDir}`);
	}

	return latestFiles.map((entry) => entry.path);
};

const collectJsonFiles = (options: ReportCommandOptions): string[] => {
	const shouldCollectAllModels = options.allModels === true || options.model.toLowerCase() === 'all';
	return shouldCollectAllModels ? collectLatestJsonFilesForAllModels() : collectLatestJsonFilesForModel(options.model);
};

const readRunPayload = (jsonPath: string): ResultsFile => {
	const jsonContent = jsonPath.toLowerCase().endsWith('.gz') ? gunzipSync(readFileSync(jsonPath)).toString('utf8') : readFileSync(jsonPath, 'utf8');
	return parseResultsFile(jsonContent);
};

export const reportCommand = (options: ReportCommandOptions): void => {
	const jsonPaths = collectJsonFiles(options);
	if (jsonPaths.length > 1 && typeof options.htmlOutput === 'string') {
		throw new TypeError('--html-output can only be used when a single .json/.json.gz file is selected');
	}

	const runEntries: RunReportEntry[] = [];
	for (const jsonPath of jsonPaths) {
		const payload = readRunPayload(jsonPath);
		const htmlPath = writeResultsPayloadHtmlFile(payload, jsonPath, options.htmlOutput);
		runEntries.push({jsonPath, htmlPath, payload});
	}

	runEntries.sort((a, b) => Date.parse(b.payload.generated_at) - Date.parse(a.payload.generated_at));
	const [latest] = runEntries;
	if (latest) {
		printSummary(latest.payload.results);
	}
	if (typeof latest === 'undefined') {
		throw new TypeError(`No .json/.json.gz result files found in ${resolve(DEFAULT_RESULTS_DIR)}`);
	}

	const outputDir = resolve(parse(latest.jsonPath).dir);
	const indexPath = writeIndexHtml(runEntries, outputDir);
	const comparisonPath = writeComparisonHtml(runEntries, outputDir);

	if (jsonPaths.length === 1) {
		console.log(`Saved HTML report to file://${latest.htmlPath}`);
	} else {
		console.log(`Rebuilt ${jsonPaths.length} HTML reports in ${outputDir}`);
	}
	console.log(`Saved HTML index to file://${indexPath}`);
	console.log(`Saved HTML comparison to file://${comparisonPath}`);
};

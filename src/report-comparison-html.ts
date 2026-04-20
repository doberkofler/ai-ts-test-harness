import {writeFileSync} from 'node:fs';
import {parse, resolve} from 'node:path';
import {summarizeResults} from './core/results-summary.ts';
import {escapeJsonForHtmlScript, type RunReportEntry} from './report-core.ts';

const COMPARISON_REPORT_FILE = 'comparison.html';

const renderComparisonHtml = (entries: RunReportEntry[], directoryPath: string): string => {
	const escapedEntries = escapeJsonForHtmlScript(
		entries.map((entry) => {
			const summary = summarizeResults(entry.payload.results);
			const totalDurationMs = entry.payload.results.reduce((sum, result) => sum + result.llm_metrics.llm_duration_ms, 0);
			const totalTokensSent = entry.payload.results.reduce((sum, result) => sum + result.llm_metrics.tokens_sent, 0);
			const totalTokensReceived = entry.payload.results.reduce((sum, result) => sum + result.llm_metrics.tokens_received, 0);
			const averageTokensPerSecond =
				summary.total === 0 ? 0 : entry.payload.results.reduce((sum, result) => sum + result.llm_metrics.average_tokens_per_second, 0) / summary.total;
			const averageDurationMs = summary.total === 0 ? 0 : totalDurationMs / summary.total;
			const scopeCategories = Array.isArray(entry.payload.selected_categories)
				? [...entry.payload.selected_categories].sort((left, right) => left.localeCompare(right))
				: [];
			const scopeLabel = scopeCategories.length > 0 ? scopeCategories.join(', ') : 'all categories';
			const systemInfo = entry.payload.system_info;

			return {
				model: entry.payload.model,
				htmlFile: parse(entry.htmlPath).base,
				generatedAt: entry.payload.generated_at,
				passRate: summary.passRatePercent,
				passed: summary.passed,
				failed: summary.failed,
				total: summary.total,
				averageDurationMs,
				totalDurationMs,
				averageTokensPerSecond,
				totalTokensSent,
				totalTokensReceived,
				scopeLabel,
				scopeKey: scopeCategories.join(','),
				hostname: typeof systemInfo === 'undefined' ? '' : systemInfo.hostname,
			};
		}),
	);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Test Harness Model Comparison</title>
<style>
:root {
	--bg-start: #f2f9ff;
	--bg-end: #eafbf1;
	--text-main: #102a43;
	--text-muted: #486581;
	--surface: rgba(255, 255, 255, 0.9);
	--stroke: #d9e2ec;
	--accent: #0b7285;
	--warn-bg: #fff7e6;
	--warn-stroke: #f6ad55;
	--warn-text: #8a4b08;
}

* { box-sizing: border-box; }
body {
	margin: 0;
	min-height: 100vh;
	font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
	color: var(--text-main);
	background:
		radial-gradient(circle at 10% 12%, rgba(14, 116, 144, 0.13), transparent 38%),
		radial-gradient(circle at 88% 12%, rgba(47, 158, 68, 0.13), transparent 34%),
		linear-gradient(180deg, var(--bg-start), var(--bg-end));
	padding: 22px;
}

.shell { max-width: 1180px; margin: 0 auto; }
.hero {
	background: linear-gradient(136deg, #0f172a, #0b7285);
	color: #f8fafc;
	border-radius: 20px;
	padding: 20px;
	box-shadow: 0 20px 42px rgba(15, 23, 42, 0.2);
}
.hero h1 { margin: 0; font-size: clamp(1.4rem, 2.7vw, 2.2rem); letter-spacing: -0.02em; }
.hero p { margin: 8px 0 0; color: #dbeafe; }

.cards {
	margin-top: 16px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 10px;
}

.card {
	background: var(--surface);
	border: 1px solid var(--stroke);
	border-radius: 14px;
	padding: 12px;
	box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.label {
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.07em;
	color: var(--text-muted);
}

.value {
	margin-top: 6px;
	font-size: 1rem;
	font-weight: 700;
	overflow-wrap: anywhere;
}

.panel {
	margin-top: 14px;
	background: var(--surface);
	border: 1px solid var(--stroke);
	border-radius: 16px;
	padding: 14px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.warning {
	margin-bottom: 12px;
	padding: 10px 12px;
	border-radius: 10px;
	background: var(--warn-bg);
	border: 1px solid var(--warn-stroke);
	color: var(--warn-text);
	font-weight: 600;
}

.table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #e6edf6; }
table { width: 100%; border-collapse: collapse; background: #fff; min-width: 860px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; }
thead th { background: #f7fbff; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; color: #334e68; }
tbody th { background: #f9fbff; font-size: 0.84rem; letter-spacing: 0.04em; text-transform: uppercase; color: #334e68; }
tbody tr:hover td { background: #f8fcff; }
.model-name { font-size: 0.92rem; font-weight: 700; text-transform: none; letter-spacing: normal; color: var(--text-main); }
.model-meta { margin-top: 4px; font-size: 0.8rem; }
a { color: var(--accent); text-decoration: none; font-weight: 700; }
a:hover { text-decoration: underline; }

@media (max-width: 700px) {
	body {
		padding: 14px;
	}
}
</style>
</head>
<body>
<main class="shell">
	<section class="hero">
		<h1>AI Test Harness Model Comparison</h1>
		<p>Directory: ${directoryPath}</p>
	</section>

	<section class="cards" aria-label="Comparison highlights">
		<div class="card">
			<div class="label">Models Compared</div>
			<div id="models-compared" class="value">n/a</div>
		</div>
		<div class="card">
			<div class="label">Best Pass Rate</div>
			<div id="best-pass-rate" class="value">n/a</div>
		</div>
		<div class="card">
			<div class="label">Fastest Avg Duration</div>
			<div id="fastest-duration" class="value">n/a</div>
		</div>
	</section>

	<section class="panel">
		<div id="scope-warning" class="warning" hidden>
			Runs have different scopes (categories and/or total problem counts). Compare speed and success rates with this context in mind.
		</div>
		<div class="table-wrap">
			<table aria-label="Model comparison table">
				<thead>
					<tr id="header-row"></tr>
				</thead>
				<tbody id="body-rows"></tbody>
			</table>
		</div>
	</section>
</main>
<script>
const models = ${escapedEntries};
models.sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));

const escapeHtml = (value) => String(value)
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;')
	.replaceAll("'", '&#39;');

const formatDuration = (durationMs) => durationMs < 1000
	? Math.round(durationMs) + 'ms'
	: (durationMs / 1000).toFixed(2) + 's';

const formatNumber = (value, fractionDigits = 0) =>
	Number.isFinite(value)
		? Number(value).toLocaleString(undefined, {
			maximumFractionDigits: fractionDigits,
			minimumFractionDigits: fractionDigits,
		})
		: 'n/a';

const headerRow = document.getElementById('header-row');
const bodyRows = document.getElementById('body-rows');
const warning = document.getElementById('scope-warning');

const scopeKeys = new Set(models.map((model) => model.scopeKey));
const totals = new Set(models.map((model) => model.total));
warning.hidden = !(scopeKeys.size > 1 || totals.size > 1);

headerRow.innerHTML = '<th>Metric</th>' + models.map((model) =>
	'<th>'
		+ '<div class="model-name">' + escapeHtml(model.model) + '</div>'
		+ '<div class="model-meta"><a href="' + escapeHtml(model.htmlFile) + '">Open report</a></div>'
		+ '</th>'
).join('');

const metrics = [
	{label: 'Generated', value: (model) => new Date(model.generatedAt).toLocaleString()},
	{label: 'Pass Rate', value: (model) => model.passRate + '%'},
	{label: 'Passed', value: (model) => formatNumber(model.passed)},
	{label: 'Failed', value: (model) => formatNumber(model.failed)},
	{label: 'Total Problems', value: (model) => formatNumber(model.total)},
	{label: 'Average Duration', value: (model) => formatDuration(model.averageDurationMs)},
	{label: 'Total LLM Duration', value: (model) => formatDuration(model.totalDurationMs)},
	{label: 'Average Tokens/Sec', value: (model) => formatNumber(model.averageTokensPerSecond, 2)},
	{label: 'Tokens Sent', value: (model) => formatNumber(model.totalTokensSent)},
	{label: 'Tokens Received', value: (model) => formatNumber(model.totalTokensReceived)},
	{label: 'Scope', value: (model) => model.scopeLabel},
	{label: 'Host', value: (model) => model.hostname || 'n/a'},
];

bodyRows.innerHTML = metrics.map((metric) =>
	'<tr>'
		+ '<th scope="row">' + escapeHtml(metric.label) + '</th>'
		+ models.map((model) => '<td>' + escapeHtml(metric.value(model)) + '</td>').join('')
		+ '</tr>'
).join('');

const bestPassRate = [...models].sort((left, right) => right.passRate - left.passRate || left.averageDurationMs - right.averageDurationMs)[0];
const fastestDuration = [...models].sort((left, right) => left.averageDurationMs - right.averageDurationMs)[0];

document.getElementById('models-compared').textContent = formatNumber(models.length);
document.getElementById('best-pass-rate').textContent = typeof bestPassRate === 'undefined'
	? 'n/a'
	: bestPassRate.model + ' (' + bestPassRate.passRate + '%)';
document.getElementById('fastest-duration').textContent = typeof fastestDuration === 'undefined'
	? 'n/a'
	: fastestDuration.model + ' (' + formatDuration(fastestDuration.averageDurationMs) + ')';
</script>
</body>
</html>
`;
};

export const writeComparisonHtml = (entries: RunReportEntry[], outputDir: string): string => {
	const comparisonPath = resolve(outputDir, COMPARISON_REPORT_FILE);
	writeFileSync(comparisonPath, renderComparisonHtml(entries, outputDir), 'utf8');
	return comparisonPath;
};

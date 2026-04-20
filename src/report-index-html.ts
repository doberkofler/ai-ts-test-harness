import {writeFileSync} from 'node:fs';
import {parse, resolve} from 'node:path';
import {summarizeResults} from './core/results-summary.ts';
import {escapeJsonForHtmlScript, type RunReportEntry} from './report-core.ts';

const COMPARISON_REPORT_FILE = 'comparison.html';

const renderIndexHtml = (entries: RunReportEntry[], directoryPath: string): string => {
	const escapedEntries = escapeJsonForHtmlScript(
		entries.map((entry) => {
			const systemInfo = entry.payload.system_info;
			const summary = summarizeResults(entry.payload.results);
			return {
				jsonFile: parse(entry.jsonPath).base,
				htmlFile: parse(entry.htmlPath).base,
				generatedAt: entry.payload.generated_at,
				model: entry.payload.model,
				passRate: summary.passRatePercent,
				passed: summary.passed,
				total: summary.total,
				hostname: typeof systemInfo === 'undefined' ? '' : systemInfo.hostname,
				cpu: typeof systemInfo === 'undefined' ? '' : systemInfo.cpu,
				gpu: typeof systemInfo === 'undefined' || typeof systemInfo.gpu !== 'string' ? '' : systemInfo.gpu,
				ramGb: typeof systemInfo === 'undefined' ? 0 : systemInfo.ram_gb,
			};
		}),
	);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Test Harness Index</title>
<style>
:root {
	--bg-start: #eef6ff;
	--bg-end: #dcf6e8;
	--text-main: #102a43;
	--text-muted: #486581;
	--surface: rgba(255, 255, 255, 0.9);
	--stroke: #d9e2ec;
	--accent: #0b7285;
	--pass: #2f9e44;
	--fail: #c92a2a;
}

* { box-sizing: border-box; }
body {
	margin: 0;
	min-height: 100vh;
	font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
	color: var(--text-main);
	background:
		radial-gradient(circle at 12% 14%, rgba(14, 116, 144, 0.14), transparent 38%),
		radial-gradient(circle at 86% 10%, rgba(47, 158, 68, 0.14), transparent 34%),
		linear-gradient(180deg, var(--bg-start), var(--bg-end));
	padding: 22px;
}

.shell { max-width: 1120px; margin: 0 auto; }
.hero {
	background: linear-gradient(135deg, #0f172a, #0b7285);
	color: #f8fafc;
	border-radius: 20px;
	padding: 20px;
	box-shadow: 0 20px 42px rgba(15, 23, 42, 0.2);
}
.hero h1 { margin: 0; font-size: clamp(1.4rem, 2.7vw, 2.2rem); letter-spacing: -0.02em; }
.hero p { margin: 8px 0 0; color: #dbeafe; }

.panel {
	margin-top: 16px;
	background: var(--surface);
	border: 1px solid var(--stroke);
	border-radius: 16px;
	padding: 14px;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.actions {
	display: flex;
	justify-content: flex-end;
	margin-bottom: 10px;
}

.action-link {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	border-radius: 10px;
	border: 1px solid #bfdbfe;
	background: #eff6ff;
	color: #0c4a6e;
	font-weight: 700;
	text-decoration: none;
}

.action-link:hover {
	background: #dbeafe;
	text-decoration: none;
}

.table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #e6edf6; }
table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { padding: 10px 12px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; }
th { background: #f7fbff; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.78rem; color: #334e68; }
tbody tr:hover { background: #f8fcff; }
.badge { display: inline-block; border-radius: 999px; padding: 2px 8px; color: #fff; font-size: 0.76rem; font-weight: 700; }
.pass { background: var(--pass); }
.fail { background: var(--fail); }
a { color: var(--accent); text-decoration: none; font-weight: 600; }
a:hover { text-decoration: underline; }
.muted { color: var(--text-muted); font-size: 0.9rem; }
</style>
</head>
<body>
<main class="shell">
	<section class="hero">
		<h1>AI Test Harness Run Index</h1>
		<p>Directory: ${directoryPath}</p>
	</section>
	<section class="panel">
		<div class="actions">
			<a class="action-link" href="${COMPARISON_REPORT_FILE}">Open model comparison</a>
		</div>
		<div class="table-wrap">
			<table aria-label="Run reports">
				<thead>
					<tr>
						<th>Generated</th>
						<th>Model</th>
						<th>Pass Rate</th>
						<th>Host</th>
						<th>Hardware</th>
						<th>Report</th>
					</tr>
				</thead>
				<tbody id="rows"></tbody>
			</table>
		</div>
	</section>
</main>
<script>
const rows = ${escapedEntries};
rows.sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt));

const tbody = document.getElementById('rows');
tbody.innerHTML = rows.map((row) => {
	const statusClass = row.passRate === 100 ? 'pass' : 'fail';
	const hardware = [row.cpu, row.gpu, row.ramGb > 0 ? row.ramGb + 'GB RAM' : ''].filter(Boolean).join(' • ');
	return '<tr>'
		+ '<td>' + new Date(row.generatedAt).toLocaleString() + '</td>'
		+ '<td><div>' + row.model + '</div><div class="muted">' + row.jsonFile + '</div></td>'
		+ '<td><span class="badge ' + statusClass + '">' + row.passRate + '%</span> (' + row.passed + '/' + row.total + ')</td>'
		+ '<td>' + (row.hostname || 'n/a') + '</td>'
		+ '<td>' + (hardware || 'n/a') + '</td>'
		+ '<td><a href="' + row.htmlFile + '">Open report</a></td>'
		+ '</tr>';
}).join('');
</script>
</body>
</html>
`;
};

export const writeIndexHtml = (entries: RunReportEntry[], outputDir: string): string => {
	const indexPath = resolve(outputDir, 'index.html');
	writeFileSync(indexPath, renderIndexHtml(entries, outputDir), 'utf8');
	return indexPath;
};

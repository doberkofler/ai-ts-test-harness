import {z} from 'zod';
import {type Result, type ResultsFile, type RuntimeConfig} from './types.ts';
import {summarizeResults} from './core/results-summary.ts';

export const resultSchema = z.object({
	problem: z.string(),
	category: z.string(),
	program: z.string(),
	passed: z.boolean(),
	error: z.string().optional(),
	duration_ms: z.number(),
});

export const resultsFileSchema = z.object({
	generated_at: z.string(),
	model: z.string(),
	ollama_url: z.string().optional(),
	llm_timeout_secs: z.number().optional(),
	cooldown_period_secs: z.number().optional(),
	debug: z.boolean().optional(),
	selected_categories: z.array(z.string()).optional(),
	planned_problem_names: z.array(z.string()).optional(),
	system_info: z
		.object({
			hostname: z.string(),
			os: z.string(),
			cpu: z.string(),
			ram_gb: z.number(),
			gpu: z.string().optional(),
		})
		.optional(),
	total: z.number(),
	passed: z.number(),
	failed: z.number(),
	pass_rate_percent: z.number(),
	results: z.array(resultSchema),
});

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

	const systemInfo =
		typeof parsed.system_info === 'undefined'
			? undefined
			: {
					hostname: parsed.system_info.hostname,
					os: parsed.system_info.os,
					cpu: parsed.system_info.cpu,
					ram_gb: parsed.system_info.ram_gb,
					...(typeof parsed.system_info.gpu === 'string' ? {gpu: parsed.system_info.gpu} : {}),
				};

	return {
		generated_at: parsed.generated_at,
		model: parsed.model,
		...(typeof parsed.ollama_url === 'string' ? {ollama_url: parsed.ollama_url} : {}),
		...(typeof parsed.llm_timeout_secs === 'number' ? {llm_timeout_secs: parsed.llm_timeout_secs} : {}),
		...(typeof parsed.cooldown_period_secs === 'number' ? {cooldown_period_secs: parsed.cooldown_period_secs} : {}),
		...(typeof parsed.debug === 'boolean' ? {debug: parsed.debug} : {}),
		...(Array.isArray(parsed.selected_categories) ? {selected_categories: parsed.selected_categories} : {}),
		...(Array.isArray(parsed.planned_problem_names) ? {planned_problem_names: parsed.planned_problem_names} : {}),
		...(typeof systemInfo === 'undefined' ? {} : {system_info: systemInfo}),
		total: parsed.total,
		passed: parsed.passed,
		failed: parsed.failed,
		pass_rate_percent: parsed.pass_rate_percent,
		results,
	};
};

export const formatResultsFile = (results: Result[], config: RuntimeConfig): ResultsFile => {
	const summary = summarizeResults(results);

	return {
		generated_at: new Date().toISOString(),
		model: config.model,
		ollama_url: config.ollamaUrl,
		llm_timeout_secs: config.llmTimeoutSecs,
		...(typeof config.cooldownPeriodSecs === 'number' ? {cooldown_period_secs: config.cooldownPeriodSecs} : {}),
		debug: config.debug,
		...(Array.isArray(config.selectedCategories) ? {selected_categories: config.selectedCategories} : {}),
		...(Array.isArray(config.plannedProblemNames) ? {planned_problem_names: config.plannedProblemNames} : {}),
		...(config.systemInfo ? {system_info: config.systemInfo} : {}),
		total: summary.total,
		passed: summary.passed,
		failed: summary.failed,
		pass_rate_percent: summary.passRatePercent,
		results,
	};
};

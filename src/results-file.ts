import {z} from 'zod';
import {type Result, type ResultsFile, type RuntimeConfig} from './types.ts';

const artifactSchema = z.object({
	kind: z.literal('changed-files-v1'),
	files: z.array(
		z.object({
			path: z.string(),
			content: z.string(),
		}),
	),
});

export const resultSchema = z.object({
	problem: z.string(),
	category: z.string(),
	program: z.string().optional(),
	artifact: artifactSchema.optional(),
	thinking: z.string().optional(),
	passed: z.boolean(),
	error: z.string().optional(),
	failure_kind: z.enum(['timeout', 'assertion', 'runtime', 'vitest', 'other']).optional(),
	llm_metrics: z.object({
		llm_duration_ms: z.number(),
		tokens_sent: z.number(),
		tokens_received: z.number(),
		average_tokens_per_second: z.number(),
	}),
});

export const resultsFileSchema = z
	.object({
		generated_at: z.string(),
		model: z.string(),
		ollama_url: z.string().optional(),
		llm_timeout_secs: z.number().optional(),
		vitest_timeout_secs: z.number().optional(),
		selected_categories: z.array(z.string()).optional(),
		system_info: z
			.object({
				hostname: z.string(),
				os: z.string(),
				cpu: z.string(),
				ram_gb: z.number(),
				gpu: z.string().optional(),
			})
			.optional(),
		results: z.array(resultSchema),
	})
	.strict();

export const isResultsFile = (data: unknown): data is ResultsFile => resultsFileSchema.safeParse(data).success;

export const parseResultsFile = (jsonContent: string): ResultsFile => {
	const data: unknown = JSON.parse(jsonContent);
	const parsed = resultsFileSchema.parse(data);

	const results: Result[] = parsed.results.map((result) =>
		typeof result.error === 'string'
			? {
					problem: result.problem,
					category: result.category,
					...(typeof result.program === 'string' ? {program: result.program} : {}),
					...(typeof result.artifact === 'undefined' ? {} : {artifact: result.artifact}),
					...(typeof result.thinking === 'string' ? {thinking: result.thinking} : {}),
					passed: result.passed,
					error: result.error,
					...(typeof result.failure_kind === 'string' ? {failure_kind: result.failure_kind} : {}),
					llm_metrics: {
						llm_duration_ms: result.llm_metrics.llm_duration_ms,
						tokens_sent: result.llm_metrics.tokens_sent,
						tokens_received: result.llm_metrics.tokens_received,
						average_tokens_per_second: result.llm_metrics.average_tokens_per_second,
					},
				}
			: {
					problem: result.problem,
					category: result.category,
					...(typeof result.program === 'string' ? {program: result.program} : {}),
					...(typeof result.artifact === 'undefined' ? {} : {artifact: result.artifact}),
					...(typeof result.thinking === 'string' ? {thinking: result.thinking} : {}),
					passed: result.passed,
					...(typeof result.failure_kind === 'string' ? {failure_kind: result.failure_kind} : {}),
					llm_metrics: {
						llm_duration_ms: result.llm_metrics.llm_duration_ms,
						tokens_sent: result.llm_metrics.tokens_sent,
						tokens_received: result.llm_metrics.tokens_received,
						average_tokens_per_second: result.llm_metrics.average_tokens_per_second,
					},
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
		...(typeof parsed.vitest_timeout_secs === 'number' ? {vitest_timeout_secs: parsed.vitest_timeout_secs} : {}),
		...(Array.isArray(parsed.selected_categories) ? {selected_categories: parsed.selected_categories} : {}),
		...(typeof systemInfo === 'undefined' ? {} : {system_info: systemInfo}),
		results,
	};
};

export const formatResultsFile = (results: Result[], config: RuntimeConfig): ResultsFile => {
	const shouldStoreThinking = config.storeThinking ?? true;
	const persistedResults = shouldStoreThinking ? results : results.map(({thinking: _thinking, ...result}) => result);

	return {
		generated_at: new Date().toISOString(),
		model: config.model,
		ollama_url: config.ollamaUrl,
		llm_timeout_secs: config.llmTimeoutSecs,
		vitest_timeout_secs: config.vitestTimeoutSecs,
		...(Array.isArray(config.selectedCategories) ? {selected_categories: config.selectedCategories} : {}),
		...(config.systemInfo ? {system_info: config.systemInfo} : {}),
		results: persistedResults,
	};
};

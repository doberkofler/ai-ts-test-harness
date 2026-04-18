import {z} from 'zod';
import {type Result, type ResultsFile, type RuntimeConfig} from './types.ts';

export const resultSchema = z.object({
	problem: z.string(),
	category: z.string(),
	program: z.string(),
	thinking: z.string().optional(),
	passed: z.boolean(),
	error: z.string().optional(),
	duration_ms: z.number(),
});

export const resultsFileSchema = z
	.object({
		generated_at: z.string(),
		model: z.string(),
		ollama_url: z.string().optional(),
		llm_timeout_secs: z.number().optional(),
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
					program: result.program,
					...(typeof result.thinking === 'string' ? {thinking: result.thinking} : {}),
					passed: result.passed,
					error: result.error,
					duration_ms: result.duration_ms,
				}
			: {
					problem: result.problem,
					category: result.category,
					program: result.program,
					...(typeof result.thinking === 'string' ? {thinking: result.thinking} : {}),
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
		...(Array.isArray(config.selectedCategories) ? {selected_categories: config.selectedCategories} : {}),
		...(config.systemInfo ? {system_info: config.systemInfo} : {}),
		results: persistedResults,
	};
};

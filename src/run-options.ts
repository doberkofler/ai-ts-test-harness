import {parseIntOption, parseOptionalNonEmptyOption, parseRequiredOption} from './core/parsing.ts';

export type RunCommandOptions = {
	model: string;
	debug: boolean;
	storeThinking?: boolean;
	llmTimeoutSecs: string;
	vitestTimeoutSecs: string;
	noCooldown: boolean;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
	output: string;
	test: string | undefined;
	category: string | undefined;
};

export type ParsedRunCommandOptions = {
	model: string;
	debug: boolean;
	storeThinking: boolean;
	llmTimeoutSecs: number;
	vitestTimeoutSecs: number;
	noCooldown: boolean;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
	output: string;
	test: string | undefined;
	category: string | undefined;
};

export const parseRunCommandOptions = (options: RunCommandOptions): ParsedRunCommandOptions => {
	const llmTimeoutSecs = parseIntOption(options.llmTimeoutSecs, {optionName: '--llm-timeout', minimum: 1});
	const vitestTimeoutSecs = parseIntOption(options.vitestTimeoutSecs, {optionName: '--vitest-timeout', minimum: 1});
	const ollamaUrl = parseRequiredOption(options.ollamaUrl, '--ollama-url');
	const output = parseRequiredOption(options.output, '--output');
	const apiKey = parseOptionalNonEmptyOption(options.apiKey, '--api-key');
	const oauthToken = parseOptionalNonEmptyOption(options.oauthToken, '--oauth-token');

	return {
		model: options.model,
		debug: options.debug,
		storeThinking: options.storeThinking ?? true,
		llmTimeoutSecs,
		vitestTimeoutSecs,
		noCooldown: options.noCooldown,
		ollamaUrl,
		...(typeof apiKey === 'string' ? {apiKey} : {}),
		...(typeof oauthToken === 'string' ? {oauthToken} : {}),
		output,
		test: options.test,
		category: options.category,
	};
};

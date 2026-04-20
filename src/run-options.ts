import {parseIntOption, parseRequiredOption} from './core/parsing.ts';

export type RunCommandOptions = {
	model: string;
	debug: boolean;
	storeThinking?: boolean;
	compress: boolean;
	overwriteResults: boolean;
	llmTimeoutSecs: string;
	vitestTimeoutSecs: string;
	cooldownTemp: string;
	test: string | undefined;
	category: string | undefined;
};

export type ParsedRunCommandOptions = {
	model: string;
	debug: boolean;
	storeThinking: boolean;
	compress: boolean;
	overwriteResults: boolean;
	llmTimeoutSecs: number;
	vitestTimeoutSecs: number;
	cooldownTemp: number;
	test: string | undefined;
	category: string | undefined;
};

export const parseRunCommandOptions = (options: RunCommandOptions): ParsedRunCommandOptions => {
	const llmTimeoutSecs = parseIntOption(options.llmTimeoutSecs, {optionName: '--llm-timeout', minimum: 1});
	const vitestTimeoutSecs = parseIntOption(options.vitestTimeoutSecs, {optionName: '--vitest-timeout', minimum: 1});
	const cooldownTemp = parseIntOption(options.cooldownTemp, {optionName: '--cooldown-temp', minimum: 0});
	parseRequiredOption(options.model, '--model');

	return {
		model: options.model,
		debug: options.debug,
		storeThinking: options.storeThinking ?? true,
		compress: options.compress,
		overwriteResults: options.overwriteResults,
		llmTimeoutSecs,
		vitestTimeoutSecs,
		cooldownTemp,
		test: options.test,
		category: options.category,
	};
};

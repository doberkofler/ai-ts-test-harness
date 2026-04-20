import {Command} from 'commander';
import {DEFAULT_COOLDOWN_TEMP_THRESHOLD, DEFAULT_LLM_TIMEOUT_SECS, DEFAULT_MODEL, DEFAULT_VITEST_TIMEOUT_SECS} from './config.ts';

export type CliOpts = {
	model: string;
	debug: boolean;
	storeThinking?: boolean;
	compress: boolean;
	overwriteResults: boolean;
	llmTimeoutSecs: string;
	vitestTimeoutSecs: string;
	cooldownTemp: string;
	htmlOutput?: string;
	test?: string;
	category?: string;
};

export const createCliProgram = (): Command => new Command().name('ai-ts-test-harness').description('A TypeScript test harness for AI models');

const isCliOpts = (data: unknown): data is CliOpts =>
	typeof data === 'object' &&
	data !== null &&
	'model' in data &&
	'debug' in data &&
	'llmTimeoutSecs' in data &&
	'vitestTimeoutSecs' in data &&
	'cooldownTemp' in data &&
	'compress' in data &&
	'overwriteResults' in data;

export const registerGlobalCliOptions = (program: Command): void => {
	program.option('--model <model>', 'Model to use', DEFAULT_MODEL);
	program.option('--debug', 'Print LLM request/response for each problem', false);
	program.option('--no-store-thinking', 'Do not persist model thinking/reasoning in result files');
	program.option('--compress', 'Compress result JSON files as .json.gz', false);
	program.option('--overwrite-results', 'Allow replacing an existing results file when a fresh run starts', false);
	program.option('--llm-timeout <seconds>', 'LLM response timeout in seconds', String(DEFAULT_LLM_TIMEOUT_SECS));
	program.option('--vitest-timeout <seconds>', 'Vitest per-test timeout in seconds', String(DEFAULT_VITEST_TIMEOUT_SECS));
	program.option('--cooldown-temp <celsius>', 'Cooldown temperature threshold in Celsius', String(DEFAULT_COOLDOWN_TEMP_THRESHOLD));
	program.option('--html-output <file>', 'Write an HTML report file (defaults to result path with .html extension)');
	program.option('--test <name>', 'Run a specific test by exact problem name');
	program.option('--category <list>', 'Run only categories from a comma-separated list (for example, algorithms,refactor)');
};

export const normalizeCliOpts = (data: unknown): CliOpts | undefined => {
	if (typeof data !== 'object' || data === null) {
		return undefined;
	}

	const llmTimeoutValue: unknown = Reflect.get(data, 'llmTimeout');
	const vitestTimeoutValue: unknown = Reflect.get(data, 'vitestTimeout');
	const cooldownTempValue: unknown = Reflect.get(data, 'cooldownTemp');
	const storeThinkingValue: unknown = Reflect.get(data, 'storeThinking');
	const compressValue: unknown = Reflect.get(data, 'compress');
	const overwriteResultsValue: unknown = Reflect.get(data, 'overwriteResults');
	const normalized = {
		...data,
		storeThinking: typeof storeThinkingValue === 'boolean' ? storeThinkingValue : true,
		compress: typeof compressValue === 'boolean' ? compressValue : false,
		overwriteResults: typeof overwriteResultsValue === 'boolean' ? overwriteResultsValue : false,
		llmTimeoutSecs: llmTimeoutValue,
		vitestTimeoutSecs: vitestTimeoutValue,
		cooldownTemp: cooldownTempValue === undefined ? String(DEFAULT_COOLDOWN_TEMP_THRESHOLD) : cooldownTempValue,
	};

	if (!isCliOpts(normalized)) {
		return undefined;
	}

	return normalized;
};

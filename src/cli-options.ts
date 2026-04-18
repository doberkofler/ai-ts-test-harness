import {Command} from 'commander';
import {DEFAULT_COOLDOWN_PERIOD_SECS, DEFAULT_LLM_TIMEOUT_SECS, DEFAULT_MODEL, DEFAULT_OLLAMA_URL} from './config.ts';

export type CliOpts = {
	model: string;
	debug: boolean;
	storeThinking?: boolean;
	llmTimeoutSecs: string;
	cooldownPeriodSecs: string;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
	output: string;
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
	'cooldownPeriodSecs' in data &&
	'ollamaUrl' in data &&
	'output' in data;

export const registerGlobalCliOptions = (program: Command): void => {
	program.option('--model <model>', 'Model to use', DEFAULT_MODEL);
	program.option('--debug', 'Print LLM request/response for each problem', false);
	program.option('--no-store-thinking', 'Do not persist model thinking/reasoning in result files');
	program.option('--llm-timeout <seconds>', 'LLM response timeout in seconds', String(DEFAULT_LLM_TIMEOUT_SECS));
	program.option('--cooldown-period <seconds>', 'Delay between problems in seconds', String(DEFAULT_COOLDOWN_PERIOD_SECS));
	program.option('--ollama-url <url>', 'Ollama-compatible API base URL', DEFAULT_OLLAMA_URL);
	program.option('--api-key <key>', 'API key for cloud model authorization');
	program.option('--oauth-token <token>', 'OAuth token for cloud model authorization');
	program.option('--output <path>', 'Directory to write results to, or file/directory to read from', 'results');
	program.option('--html-output <file>', 'Write an HTML report file (defaults to output path with .html extension)');
	program.option('--test <name>', 'Run a specific test by exact problem name');
	program.option('--category <list>', 'Run only categories from a comma-separated list (for example, algorithms,refactor)');
};

export const normalizeCliOpts = (data: unknown): CliOpts | undefined => {
	if (typeof data !== 'object' || data === null) {
		return undefined;
	}

	const llmTimeoutValue: unknown = Reflect.get(data, 'llmTimeout');
	const cooldownPeriodValue: unknown = Reflect.get(data, 'cooldownPeriod');
	const storeThinkingValue: unknown = Reflect.get(data, 'storeThinking');
	const normalized = {
		...data,
		storeThinking: typeof storeThinkingValue === 'boolean' ? storeThinkingValue : true,
		llmTimeoutSecs: llmTimeoutValue,
		cooldownPeriodSecs: cooldownPeriodValue,
	};

	if (!isCliOpts(normalized)) {
		return undefined;
	}

	return normalized;
};

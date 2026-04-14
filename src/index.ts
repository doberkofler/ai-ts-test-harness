import {Command} from 'commander';
import {DEFAULT_LLM_TIMEOUT_SECS, DEFAULT_COOLDOWN_PERIOD_SECS, DEFAULT_OLLAMA_URL, DEFAULT_MODEL} from './config.ts';
import {runCommand} from './run.ts';
import {reportCommand} from './report.ts';
import {validateCommand} from './validate.ts';

type CliOpts = {
	model: string;
	debug: boolean;
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

const isCliOpts = (data: unknown): data is CliOpts =>
	typeof data === 'object' &&
	data !== null &&
	'model' in data &&
	'debug' in data &&
	'llmTimeoutSecs' in data &&
	'cooldownPeriodSecs' in data &&
	'ollamaUrl' in data &&
	'output' in data;

const normalizeCliOpts = (data: unknown): CliOpts | undefined => {
	if (typeof data !== 'object' || data === null) {
		return undefined;
	}

	const llmTimeoutValue: unknown = Reflect.get(data, 'llmTimeout');
	const cooldownPeriodValue: unknown = Reflect.get(data, 'cooldownPeriod');
	const normalized = {
		...data,
		llmTimeoutSecs: llmTimeoutValue,
		cooldownPeriodSecs: cooldownPeriodValue,
	};

	if (!isCliOpts(normalized)) {
		return undefined;
	}

	return normalized;
};

const main = async (): Promise<void> => {
	const program = new Command();
	program.name('ai-ts-test-harness').description('A TypeScript test harness for AI models');
	program.option('--model <model>', 'Model to use', DEFAULT_MODEL);
	program.option('--debug', 'Print LLM request/response for each problem', false);
	program.option('--llm-timeout <seconds>', 'LLM response timeout in seconds', String(DEFAULT_LLM_TIMEOUT_SECS));
	program.option('--cooldown-period <seconds>', 'Delay between problems in seconds', String(DEFAULT_COOLDOWN_PERIOD_SECS));
	program.option('--ollama-url <url>', 'Ollama-compatible API base URL', DEFAULT_OLLAMA_URL);
	program.option('--api-key <key>', 'API key for cloud model authorization');
	program.option('--oauth-token <token>', 'OAuth token for cloud model authorization');
	program.option('--output <file>', 'Write run results to a JSON file', 'results.json');
	program.option('--html-output <file>', 'Write an HTML report file (defaults to output path with .html extension)');
	program.option('--test <name>', 'Run a specific test by exact problem name');
	program.option('--category <list>', 'Run only categories from a comma-separated list (for example, algorithms,refactor)');

	let commandExecuted = false;

	program
		.command('run')
		.description('Run tests')
		.action(async (_options, command: Command) => {
			commandExecuted = true;
			const opts = normalizeCliOpts(command.optsWithGlobals());
			if (typeof opts === 'undefined') {
				throw new TypeError('Invalid CLI options');
			}

			const runOpts: Parameters<typeof runCommand>[0] = {
				model: opts.model,
				debug: opts.debug,
				llmTimeoutSecs: opts.llmTimeoutSecs,
				cooldownPeriodSecs: opts.cooldownPeriodSecs,
				ollamaUrl: opts.ollamaUrl,
				...(typeof opts.apiKey === 'string' ? {apiKey: opts.apiKey} : {}),
				...(typeof opts.oauthToken === 'string' ? {oauthToken: opts.oauthToken} : {}),
				output: opts.output,
				test: opts.test,
				category: opts.category,
			};

			await runCommand(runOpts);
		});

	program
		.command('validate')
		.description('Validate problem tests against optional solutions')
		.action(async (_options, command: Command) => {
			commandExecuted = true;
			const opts = normalizeCliOpts(command.optsWithGlobals());
			if (typeof opts === 'undefined') {
				throw new TypeError('Invalid CLI options');
			}

			await validateCommand({
				test: opts.test,
				category: opts.category,
				debug: opts.debug,
			});
		});

	program
		.command('report')
		.description('Generate reports')
		.action((_options, command: Command) => {
			commandExecuted = true;
			const opts = normalizeCliOpts(command.optsWithGlobals());
			if (typeof opts === 'undefined') {
				throw new TypeError('Invalid CLI options');
			}

			const reportOpts: Parameters<typeof reportCommand>[0] = {
				output: opts.output,
				htmlOutput: opts.htmlOutput,
			};

			reportCommand(reportOpts);
		});

	program.action(async (_options, command: Command) => {
		if (commandExecuted) {
			return;
		}

		// If no command, validate, run tests, then report.
		const opts = normalizeCliOpts(command.opts());
		if (typeof opts === 'undefined') {
			throw new TypeError('Invalid CLI options');
		}

		const runOpts: Parameters<typeof runCommand>[0] = {
			model: opts.model,
			debug: opts.debug,
			llmTimeoutSecs: opts.llmTimeoutSecs,
			cooldownPeriodSecs: opts.cooldownPeriodSecs,
			ollamaUrl: opts.ollamaUrl,
			...(typeof opts.apiKey === 'string' ? {apiKey: opts.apiKey} : {}),
			...(typeof opts.oauthToken === 'string' ? {oauthToken: opts.oauthToken} : {}),
			output: opts.output,
			test: opts.test,
			category: opts.category,
		};

		await runCommand(runOpts);

		const reportOpts: Parameters<typeof reportCommand>[0] = {
			output: opts.output,
			htmlOutput: opts.htmlOutput,
		};

		await validateCommand({
			test: opts.test,
			category: opts.category,
			debug: opts.debug,
		});

		reportCommand(reportOpts);
	});

	await program.parseAsync(process.argv);
};

const isEntrypoint = process.argv[1] === import.meta.filename;
if (isEntrypoint) {
	await main();
}

import {Command} from 'commander';
import {DEFAULT_LLM_TIMEOUT_MS, DEFAULT_OLLAMA_URL} from './generate.ts';
import {runCommand} from './run.ts';
import {reportCommand} from './report.ts';

type CliOpts = {
	model: string;
	debug: boolean;
	llmTimeoutMs: string;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
	output: string;
	htmlOutput?: string;
	test?: string;
	category?: string;
};

const isCliOpts = (data: unknown): data is CliOpts =>
	typeof data === 'object' && data !== null && 'model' in data && 'debug' in data && 'llmTimeoutMs' in data && 'ollamaUrl' in data && 'output' in data;

const main = async (): Promise<void> => {
	const program = new Command();
	program.name('ai-ts-test-harness').description('A TypeScript test harness for AI models');
	program.option('--model <model>', 'Model to use', 'gemma4:31b-it-q4_K_M');
	program.option('--debug', 'Print LLM request/response for each problem', false);
	program.option('--llm-timeout-ms <ms>', 'LLM response timeout in milliseconds', String(DEFAULT_LLM_TIMEOUT_MS));
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
			const optsAny = command.optsWithGlobals();
			if (!isCliOpts(optsAny)) {
				throw new Error('Invalid CLI options');
			}
			const opts = optsAny;

			const runOpts: Parameters<typeof runCommand>[0] = {
				model: opts.model,
				debug: opts.debug,
				llmTimeoutMs: opts.llmTimeoutMs,
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
		.command('report')
		.description('Generate reports')
		.action((_options, command: Command) => {
			commandExecuted = true;
			const optsAny = command.optsWithGlobals();
			if (!isCliOpts(optsAny)) {
				throw new Error('Invalid CLI options');
			}
			const opts = optsAny;

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

		// If no command, run both
		const optsAny = command.opts();
		if (!isCliOpts(optsAny)) {
			throw new Error('Invalid CLI options');
		}
		const opts = optsAny;

		const runOpts: Parameters<typeof runCommand>[0] = {
			model: opts.model,
			debug: opts.debug,
			llmTimeoutMs: opts.llmTimeoutMs,
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
		reportCommand(reportOpts);
	});

	await program.parseAsync(process.argv);
};

const isEntrypoint = process.argv[1] === import.meta.filename;
if (isEntrypoint) {
	await main();
}

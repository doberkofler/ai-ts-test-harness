import {createCliProgram, registerGlobalCliOptions, normalizeCliOpts} from './cli-options.ts';
import {toReportCommandOptions, toRunCommandOptions, toValidateCommandOptions} from './command-options.ts';
import {authListCommand, authUseCommand, loginCommand, logoutCommand, modelsCommand} from './auth-commands.ts';
import {printRuntimeConfig} from './print-runtime-config.ts';
import {reportCommand} from './report.ts';
import {createRerunFailedContext, createRunContext, runCommandWithContext} from './run.ts';
import {validateCommand} from './validate.ts';

export const toCliErrorMessage = (error: unknown): string => {
	if (error instanceof Error && typeof error.message === 'string' && error.message.length > 0) {
		return error.message;
	}

	const fallback = String(error);
	return fallback.length > 0 ? fallback : 'Unexpected error';
};

const main = async (): Promise<void> => {
	const program = createCliProgram();
	registerGlobalCliOptions(program);

	let commandExecuted = false;

	program
		.command('login [provider]')
		.description('Create or update a provider connection')
		.option('--api-key <key>', 'API key for the provider')
		.option('--oauth-token <token>', 'OAuth token for the provider')
		.option('--oauth', 'Use browser OAuth flow when supported', false)
		.option('--url <url>', 'Provider endpoint URL')
		.option('--name <name>', 'Connection name (defaults to provider id)')
		.option('--default-model <model>', 'Default model for this connection')
		.option('--default', 'Set this connection as default', false)
		.action(
			async (
				provider: string | undefined,
				options: {
					apiKey?: string;
					oauthToken?: string;
					oauth?: boolean;
					url?: string;
					name?: string;
					defaultModel?: string;
					default?: boolean;
				},
			) => {
				commandExecuted = true;
				const loginOptions = {
					...(typeof options.apiKey === 'string' ? {apiKey: options.apiKey} : {}),
					...(typeof options.oauthToken === 'string' ? {oauthToken: options.oauthToken} : {}),
					...(options.oauth === true ? {oauth: true} : {}),
					...(typeof options.url === 'string' ? {url: options.url} : {}),
					...(typeof options.name === 'string' ? {name: options.name} : {}),
					...(typeof options.defaultModel === 'string' ? {defaultModel: options.defaultModel} : {}),
					...(options.default === true ? {setDefault: true} : {}),
				};
				await loginCommand(provider, loginOptions);
			},
		);

	program
		.command('logout <connection>')
		.description('Remove a provider connection')
		.action((connection: string) => {
			commandExecuted = true;
			logoutCommand(connection);
		});

	const authCommand = program.command('auth').description('Manage authentication connections');
	authCommand
		.command('list')
		.description('List saved provider connections')
		.action(() => {
			commandExecuted = true;
			authListCommand();
		});

	authCommand
		.command('use <connection>')
		.description('Set default provider connection')
		.action((connection: string) => {
			commandExecuted = true;
			authUseCommand(connection);
		});

	program
		.command('models [search]')
		.description('List models available for saved connections')
		.action(async (search: string | undefined) => {
			commandExecuted = true;
			await modelsCommand(search);
		});

	program
		.command('run')
		.description('Run tests')
		.action(async () => {
			commandExecuted = true;
			const opts = normalizeCliOpts(program.optsWithGlobals());
			if (typeof opts === 'undefined') {
				throw new TypeError('Invalid CLI options');
			}

			const runContext = createRunContext(toRunCommandOptions(opts));
			printRuntimeConfig(runContext.problems, runContext.runtimeConfig);
			await runCommandWithContext(runContext);
		});

	program
		.command('validate')
		.description('Validate problem tests against optional solutions')
		.action(async () => {
			commandExecuted = true;
			const opts = normalizeCliOpts(program.optsWithGlobals());
			if (typeof opts === 'undefined') {
				throw new TypeError('Invalid CLI options');
			}

			await validateCommand(toValidateCommandOptions(opts));
		});

	program
		.command('report')
		.description('Generate report from latest model results')
		.action(() => {
			commandExecuted = true;
			const opts = normalizeCliOpts(program.optsWithGlobals());
			if (typeof opts === 'undefined') {
				throw new TypeError('Invalid CLI options');
			}

			reportCommand(toReportCommandOptions(opts));
		});

	program
		.command('rerun-failed')
		.description('Re-run only problems that failed in previous run for this model')
		.action(async () => {
			commandExecuted = true;
			const opts = normalizeCliOpts(program.optsWithGlobals());
			if (typeof opts === 'undefined') {
				throw new TypeError('Invalid CLI options');
			}

			const runContext = createRerunFailedContext(toRunCommandOptions(opts));
			printRuntimeConfig(runContext.problems, runContext.runtimeConfig);
			await runCommandWithContext(runContext);
		});

	program.action(async () => {
		if (commandExecuted) {
			return;
		}

		const opts = normalizeCliOpts(program.opts());
		if (typeof opts === 'undefined') {
			throw new TypeError('Invalid CLI options');
		}

		const runContext = createRunContext(toRunCommandOptions(opts));
		printRuntimeConfig(runContext.problems, runContext.runtimeConfig);
		await runCommandWithContext(runContext);
	});

	await program.parseAsync(process.argv);
};

const isEntrypoint = process.argv[1] === import.meta.filename;
if (isEntrypoint) {
	await main().catch((error: unknown) => {
		console.error(toCliErrorMessage(error));
		process.exitCode = 1;
	});
}

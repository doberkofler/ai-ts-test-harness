import {createCliProgram, registerGlobalCliOptions, normalizeCliOpts} from './cli-options.ts';
import {toReportCommandOptions, toRunCommandOptions, toValidateCommandOptions} from './command-options.ts';
import {printRuntimeConfig} from './print-runtime-config.ts';
import {reportCommand} from './report.ts';
import {createRerunFailedContext, createRunContext, runCommandWithContext} from './run.ts';
import {validateCommand} from './validate.ts';

const main = async (): Promise<void> => {
	const program = createCliProgram();
	registerGlobalCliOptions(program);

	let commandExecuted = false;

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
	await main();
}

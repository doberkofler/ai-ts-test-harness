import {type ReportCommandOptions} from './report.ts';
import {type RunCommandOptions} from './run-options.ts';
import {type ValidateCommandOptions} from './validate.ts';
import {type CliOpts} from './cli-options.ts';

export const toRunCommandOptions = (opts: CliOpts): RunCommandOptions => ({
	model: opts.model,
	debug: opts.debug,
	storeThinking: opts.storeThinking ?? true,
	compress: opts.compress,
	overwriteResults: opts.overwriteResults,
	llmTimeoutSecs: opts.llmTimeoutSecs,
	vitestTimeoutSecs: opts.vitestTimeoutSecs,
	cooldownTemp: opts.cooldownTemp,
	test: opts.test,
	category: opts.category,
});

export const toValidateCommandOptions = (opts: CliOpts): ValidateCommandOptions => ({
	test: opts.test,
	category: opts.category,
	debug: opts.debug,
});

export const toReportCommandOptions = (opts: CliOpts): ReportCommandOptions => ({
	model: opts.model,
	htmlOutput: opts.htmlOutput,
});

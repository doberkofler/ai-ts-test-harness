import {type ReportCommandOptions} from './report.ts';
import {type RunCommandOptions} from './run-options.ts';
import {type ValidateCommandOptions} from './validate.ts';
import {type CliOpts} from './cli-options.ts';

export const toRunCommandOptions = (opts: CliOpts): RunCommandOptions => ({
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
});

export const toValidateCommandOptions = (opts: CliOpts): ValidateCommandOptions => ({
	test: opts.test,
	category: opts.category,
	debug: opts.debug,
});

export const toReportCommandOptions = (opts: CliOpts): ReportCommandOptions => ({
	output: opts.output,
	htmlOutput: opts.htmlOutput,
});

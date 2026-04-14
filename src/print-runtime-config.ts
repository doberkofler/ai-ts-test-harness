import {formatMs, STYLES, styleText} from './utils.ts';
import {type Problem, type RuntimeConfig} from './types.ts';

export const printRuntimeConfig = (problems: Problem[], config: RuntimeConfig): void => {
	const authMode = typeof config.apiKey === 'string' ? 'api-key' : typeof config.oauthToken === 'string' ? 'oauth-token' : 'ollama-default';
	const cooldownPeriodSecs = config.cooldownPeriodSecs ?? 0;

	console.log(styleText('AI Test Harness', STYLES.bold));
	console.log(styleText('---------------', STYLES.dim));
	console.log(`Model      : ${styleText(config.model, STYLES.cyan)}`);
	console.log(`Ollama URL : ${config.ollamaUrl}`);
	console.log(`Auth       : ${authMode}`);
	console.log(`Timeout    : ${config.llmTimeoutSecs}s (${formatMs(config.llmTimeoutSecs * 1000)})`);
	console.log(`Cooldown   : ${cooldownPeriodSecs}s (${formatMs(cooldownPeriodSecs * 1000)})`);
	console.log(`Debug      : ${config.debug ? styleText('enabled', STYLES.yellow) : 'disabled'}`);
	console.log(
		`Categories : ${Array.isArray(config.selectedCategories) && config.selectedCategories.length > 0 ? config.selectedCategories.join(', ') : 'all'}`,
	);
	console.log(`Problems   : ${problems.length}\n`);
};

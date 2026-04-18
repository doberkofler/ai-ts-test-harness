import {STYLES, styleText} from './utils.ts';
import {formatMs} from './core/time-format.ts';
import {type Problem, type RuntimeConfig} from './types.ts';

export const printRuntimeConfig = (problems: Problem[], config: RuntimeConfig): void => {
	const authMode = typeof config.apiKey === 'string' ? 'api-key' : typeof config.oauthToken === 'string' ? 'oauth-token' : 'ollama-default';
	const cooldown = config.noCooldown === true ? styleText('disabled', STYLES.yellow) : '50% task duration (max 1m)';

	console.log(styleText('AI Test Harness', STYLES.bold));
	console.log(styleText('---------------', STYLES.dim));
	console.log(`Model:      ${styleText(config.model, STYLES.cyan)}`);
	console.log(`Ollama URL: ${config.ollamaUrl}`);
	console.log(`Auth:       ${authMode}`);
	console.log(`Timeout:    ${formatMs(config.llmTimeoutSecs * 1000)}`);
	console.log(`Cooldown:   ${cooldown}`);
	console.log(`Debug:      ${config.debug ? styleText('enabled', STYLES.yellow) : 'disabled'}`);
	console.log(`Thinking:   ${(config.storeThinking ?? true) ? 'stored' : styleText('not stored', STYLES.yellow)}`);
	console.log(`Categories: ${Array.isArray(config.selectedCategories) && config.selectedCategories.length > 0 ? config.selectedCategories.join(', ') : 'all'}`);
	console.log(`Problems:   ${problems.length}\n`);
};

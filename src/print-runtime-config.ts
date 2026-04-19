import {STYLES, styleText} from './utils.ts';
import {formatMs} from './core/time-format.ts';
import {type Problem, type RuntimeConfig} from './types.ts';

export const printRuntimeConfig = (problems: Problem[], config: RuntimeConfig): void => {
	const authMode = typeof config.apiKey === 'string' ? 'api-key' : typeof config.oauthToken === 'string' ? 'oauth-token' : 'ollama-default';
	const cooldown = config.noCooldown === true ? styleText('disabled', STYLES.yellow) : '50% task duration (min 10s, max 1m)';
	const VALUE_COLUMN = 14;
	const formatLine = (label: string, value: string): string => `${`${label}:`.padEnd(VALUE_COLUMN, ' ')}${value}`;

	console.log(styleText('AI Test Harness', STYLES.bold));
	console.log(styleText('---------------', STYLES.dim));
	console.log(formatLine('Model', styleText(config.model, STYLES.cyan)));
	console.log(formatLine('Ollama URL', config.ollamaUrl));
	console.log(formatLine('Auth', authMode));
	console.log(formatLine('LLM timeout', formatMs(config.llmTimeoutSecs * 1000)));
	console.log(formatLine('Test timeout', formatMs(config.vitestTimeoutSecs * 1000)));
	console.log(formatLine('Cooldown', cooldown));
	console.log(formatLine('Debug', config.debug ? styleText('enabled', STYLES.yellow) : 'disabled'));
	console.log(formatLine('Thinking', (config.storeThinking ?? true) ? 'stored' : styleText('not stored', STYLES.yellow)));
	console.log(
		formatLine('Categories', Array.isArray(config.selectedCategories) && config.selectedCategories.length > 0 ? config.selectedCategories.join(', ') : 'all'),
	);
	console.log(formatLine('Problems', `${problems.length}`));
	console.log('');
};

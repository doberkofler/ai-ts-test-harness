import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434/v1';
export const DEFAULT_MODEL = 'gemma4:26b-a4b-it-q8_0';
export const DEFAULT_LLM_TIMEOUT_SECS = 5 * 60;
export const DEFAULT_VITEST_TIMEOUT_SECS = 60;
export const DEFAULT_RESULTS_DIR = 'results';
export const DEFAULT_MAX_COOLDOWN_MS = 60_000;
export const DEFAULT_MIN_COOLDOWN_MS = 10_000;
export const DEFAULT_COOLDOWN_RATIO = 0.5;

export const DEFAULT_CONFIG_DIR = '.ai-ts-test-harness';

export const getConfigDir = (): string => join(homedir(), DEFAULT_CONFIG_DIR);

export const getAuthConfigPath = (): string => join(getConfigDir(), 'auth.json');

export const ensureConfigDir = (): string => {
	const configDir = getConfigDir();
	mkdirSync(configDir, {recursive: true, mode: 0o700});
	return configDir;
};

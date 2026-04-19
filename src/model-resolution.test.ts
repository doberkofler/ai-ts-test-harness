import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {resolveModelFromAuth} from './model-resolution.ts';

const writeAuthFile = (authPath: string): void => {
	writeFileSync(
		authPath,
		`${JSON.stringify(
			{
				version: 1,
				defaultConnectionId: 'openai:main',
				connections: [
					{
						id: 'openai:main',
						name: 'main',
						provider: 'openai',
						baseUrl: 'https://api.openai.com/v1',
						authType: 'api-key',
						apiKey: 'secret',
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
					{
						id: 'ollama:local',
						name: 'local',
						provider: 'ollama',
						baseUrl: 'http://localhost:11434/v1',
						authType: 'none',
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
				],
			},
			undefined,
			2,
		)}\n`,
		'utf8',
	);
};

describe('resolveModelFromAuth', () => {
	test('uses default connection for bare model id', () => {
		const tempDir = mkdtempSync(join(tmpdir(), 'model-resolution-'));
		const authPath = join(tempDir, 'auth.json');
		writeAuthFile(authPath);

		const resolved = resolveModelFromAuth('gpt-4.1-mini', authPath);
		expect(resolved.provider).toBe('openai');
		expect(resolved.modelId).toBe('gpt-4.1-mini');
		expect(resolved.baseUrl).toBe('https://api.openai.com/v1');
	});

	test('resolves explicit provider/model syntax', () => {
		const tempDir = mkdtempSync(join(tmpdir(), 'model-resolution-'));
		const authPath = join(tempDir, 'auth.json');
		writeAuthFile(authPath);

		const resolved = resolveModelFromAuth('ollama/gemma3:27b', authPath);
		expect(resolved.provider).toBe('ollama');
		expect(resolved.modelId).toBe('gemma3:27b');
		expect(resolved.authType).toBe('none');
	});
});

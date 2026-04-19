import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import {emptyAuthStore, loadAuthStore, saveAuthStore, setDefaultConnection, upsertConnection} from './auth-store.ts';

describe('auth-store', () => {
	const tempDirs: string[] = [];

	afterEach(() => {
		for (const dir of tempDirs) {
			try {
				rmSync(dir, {recursive: true, force: true});
			} catch {
				// ignore cleanup failures in tests
			}
		}
		tempDirs.length = 0;
	});

	test('creates and reloads auth store', () => {
		const tempDir = mkdtempSync(join(tmpdir(), 'auth-store-'));
		tempDirs.push(tempDir);
		const authPath = join(tempDir, 'auth.json');

		const store = upsertConnection(emptyAuthStore(), {
			provider: 'ollama',
			name: 'local',
			baseUrl: 'http://localhost:11434/v1',
			authType: 'none',
		});

		saveAuthStore(store, authPath);
		const loaded = loadAuthStore(authPath);
		const [firstConnection] = loaded.connections;
		expect(loaded.connections).toHaveLength(1);
		expect(firstConnection).toBeDefined();
		if (typeof firstConnection === 'undefined') {
			throw new TypeError('Expected first connection to be defined');
		}
		expect(firstConnection.provider).toBe('ollama');
		expect(readFileSync(authPath, 'utf8')).toContain('local');
	});

	test('sets default connection by identifier', () => {
		const first = upsertConnection(emptyAuthStore(), {
			provider: 'ollama',
			name: 'local',
			baseUrl: 'http://localhost:11434/v1',
			authType: 'none',
		});
		const second = upsertConnection(first, {
			provider: 'openai',
			name: 'prod',
			baseUrl: 'https://api.openai.com/v1',
			authType: 'api-key',
			apiKey: 'secret',
		});

		const selected = setDefaultConnection(second, 'prod');
		expect(selected.defaultConnectionId).toBe('openai:prod');
	});
});

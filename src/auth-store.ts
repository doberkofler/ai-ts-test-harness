import {chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {z} from 'zod';
import {ensureConfigDir, getAuthConfigPath} from './config.ts';
import {type ProviderId} from './provider-registry.ts';

const authConnectionSchema = z.discriminatedUnion('authType', [
	z.object({
		authType: z.literal('none'),
	}),
	z.object({
		authType: z.literal('api-key'),
		apiKey: z.string().min(1),
	}),
	z.object({
		authType: z.literal('oauth-token'),
		oauthToken: z.string().min(1),
	}),
]);

const connectionSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		provider: z.enum(['ollama', 'openai', 'openrouter']),
		baseUrl: z.string().min(1),
		defaultModel: z.string().min(1).optional(),
		createdAt: z.string().min(1),
		updatedAt: z.string().min(1),
	})
	.and(authConnectionSchema);

const authStoreSchema = z.object({
	version: z.literal(1),
	defaultConnectionId: z.string().min(1).optional(),
	connections: z.array(connectionSchema),
});

export type AuthConnection = z.infer<typeof connectionSchema>;
export type AuthStore = z.infer<typeof authStoreSchema>;
export type UpsertConnectionInput =
	| {
			id?: string;
			name: string;
			provider: ProviderId;
			baseUrl: string;
			defaultModel?: string;
			authType: 'none';
	  }
	| {
			id?: string;
			name: string;
			provider: ProviderId;
			baseUrl: string;
			defaultModel?: string;
			authType: 'api-key';
			apiKey: string;
	  }
	| {
			id?: string;
			name: string;
			provider: ProviderId;
			baseUrl: string;
			defaultModel?: string;
			authType: 'oauth-token';
			oauthToken: string;
	  };

export const emptyAuthStore = (): AuthStore => ({
	version: 1,
	connections: [],
});

export const loadAuthStore = (authPath: string = getAuthConfigPath()): AuthStore => {
	if (!existsSync(authPath)) {
		return emptyAuthStore();
	}

	const raw = readFileSync(authPath, 'utf8');
	const parsedJson: unknown = JSON.parse(raw);
	return authStoreSchema.parse(parsedJson);
};

export const saveAuthStore = (store: AuthStore, authPath: string = getAuthConfigPath()): void => {
	ensureConfigDir();
	mkdirSync(dirname(authPath), {recursive: true, mode: 0o700});
	writeFileSync(authPath, `${JSON.stringify(store, undefined, 2)}\n`, {encoding: 'utf8', mode: 0o600});
	chmodSync(authPath, 0o600);
};

export const getDefaultConnection = (store: AuthStore): AuthConnection | undefined => {
	if (typeof store.defaultConnectionId === 'string') {
		const selected = store.connections.find((connection) => connection.id === store.defaultConnectionId);
		if (selected) {
			return selected;
		}
	}

	return store.connections[0];
};

export const getConnectionByProvider = (store: AuthStore, provider: ProviderId): AuthConnection | undefined => {
	const defaultConnection = getDefaultConnection(store);
	if (typeof defaultConnection === 'undefined') {
		return store.connections.find((connection) => connection.provider === provider);
	}

	if (defaultConnection.provider === provider) {
		return defaultConnection;
	}

	return store.connections.find((connection) => connection.provider === provider);
};

export const upsertConnection = (store: AuthStore, connection: UpsertConnectionInput, options: {setAsDefault?: boolean} = {}): AuthStore => {
	const now = new Date().toISOString();
	const existingIndex = store.connections.findIndex((entry) => entry.provider === connection.provider && entry.name === connection.name);
	const existing = existingIndex !== -1 ? store.connections[existingIndex] : undefined;
	const existingId = typeof existing === 'undefined' ? undefined : existing.id;
	const existingCreatedAt = typeof existing === 'undefined' ? undefined : existing.createdAt;
	const persisted = connectionSchema.parse({
		...connection,
		id: connection.id ?? existingId ?? `${connection.provider}:${connection.name}`,
		createdAt: existingCreatedAt ?? now,
		updatedAt: now,
	});

	const nextConnections = [...store.connections];
	if (existingIndex !== -1) {
		nextConnections[existingIndex] = persisted;
	} else {
		nextConnections.push(persisted);
	}

	const shouldSetDefault = options.setAsDefault === true || typeof store.defaultConnectionId === 'undefined';
	return {
		...store,
		connections: nextConnections,
		...(shouldSetDefault ? {defaultConnectionId: persisted.id} : {}),
	};
};

export const removeConnection = (store: AuthStore, identifier: string): AuthStore => {
	const nextConnections = store.connections.filter(
		(connection) => connection.id !== identifier && connection.name !== identifier && connection.provider !== identifier,
	);
	if (nextConnections.length === store.connections.length) {
		return store;
	}

	const hadDefault = typeof store.defaultConnectionId === 'string' && !nextConnections.some((connection) => connection.id === store.defaultConnectionId);
	const [fallbackConnection] = nextConnections;
	const fallbackConnectionId = typeof fallbackConnection === 'undefined' ? undefined : fallbackConnection.id;
	return {
		...store,
		connections: nextConnections,
		...(hadDefault ? {defaultConnectionId: fallbackConnectionId} : {}),
	};
};

export const setDefaultConnection = (store: AuthStore, identifier: string): AuthStore => {
	const match = store.connections.find((connection) => connection.id === identifier || connection.name === identifier || connection.provider === identifier);
	if (!match) {
		throw new TypeError(`Unknown connection: ${identifier}`);
	}

	return {
		...store,
		defaultConnectionId: match.id,
	};
};

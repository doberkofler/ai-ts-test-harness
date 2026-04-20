import {type ExecuteRunOptions} from './run-execution.ts';
import {getAuthConfigPath} from './config.ts';
import {getOAuthApiKey} from '@mariozechner/pi-ai/oauth';
import {z} from 'zod';
import {getConnectionByProvider, getDefaultConnection, loadAuthStore, saveAuthStore, type StoredOAuthCredentials, upsertConnection} from './auth-store.ts';
import {getProviderById, type ProviderId} from './provider-registry.ts';

export type ResolvedModel = {
	connectionId: string;
	provider: ProviderId;
	requestedModel: string;
	resolvedModel: string;
	modelId: string;
	connectionName: string;
	baseUrl: string;
	authType: 'none' | 'api-key' | 'oauth-token' | 'oauth-credentials';
	apiKey?: string;
	oauthToken?: string;
	oauthProvider?: string;
	oauthCredentials?: StoredOAuthCredentials;
};

const splitProviderModel = (model: string): {provider: ProviderId; model: string} | undefined => {
	const slashIndex = model.indexOf('/');
	if (slashIndex <= 0 || slashIndex >= model.length - 1) {
		return undefined;
	}

	const providerCandidate = model.slice(0, slashIndex);
	const modelId = model.slice(slashIndex + 1);
	if (typeof getProviderById(providerCandidate) === 'undefined') {
		return undefined;
	}

	return {
		provider: providerCandidate,
		model: modelId,
	};
};

export const resolveModelFromAuth = (requestedModel: string, authPath: string = getAuthConfigPath()): ResolvedModel => {
	const store = loadAuthStore(authPath);
	const providerModel = splitProviderModel(requestedModel);
	const selectedConnection = providerModel ? getConnectionByProvider(store, providerModel.provider) : getDefaultConnection(store);

	if (!selectedConnection) {
		throw new TypeError('No configured connections found. Run `ai-ts-test-harness login` first.');
	}

	const provider = providerModel ? providerModel.provider : selectedConnection.provider;
	const providerDefinition = getProviderById(provider);
	if (!providerDefinition) {
		throw new TypeError(`Unknown provider: ${provider}`);
	}

	const resolvedModelId = providerModel ? providerModel.model : requestedModel;
	const resolvedModel = `${provider}/${resolvedModelId}`;

	if ((providerDefinition.auth === 'api-key' || providerDefinition.auth === 'oauth-or-api-key') && selectedConnection.authType === 'none') {
		throw new TypeError(`Connection ${selectedConnection.name} requires an API key. Run \`ai-ts-test-harness login ${provider}\`.`);
	}
	if (providerDefinition.auth === 'oauth' && selectedConnection.authType !== 'oauth-credentials') {
		throw new TypeError(`Connection ${selectedConnection.name} requires OAuth login. Run \`ai-ts-test-harness login ${provider} --oauth\`.`);
	}

	return {
		connectionId: selectedConnection.id,
		provider,
		requestedModel,
		resolvedModel,
		modelId: resolvedModelId,
		connectionName: selectedConnection.name,
		baseUrl: selectedConnection.baseUrl,
		authType: selectedConnection.authType,
		...(selectedConnection.authType === 'api-key' ? {apiKey: selectedConnection.apiKey} : {}),
		...(selectedConnection.authType === 'oauth-token' ? {oauthToken: selectedConnection.oauthToken} : {}),
		...(selectedConnection.authType === 'oauth-credentials'
			? {oauthProvider: selectedConnection.oauthProvider, oauthCredentials: selectedConnection.oauthCredentials}
			: {}),
	};
};

const toStoredOAuthCredentials = (value: unknown): StoredOAuthCredentials => {
	const schema = z
		.object({
			refresh: z.string().min(1),
			access: z.string().min(1),
			expires: z.number(),
		})
		.catchall(z.unknown());
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		throw new TypeError('OAuth credential refresh returned invalid payload.');
	}

	return parsed.data;
};

export const resolveRuntimeAuth = async (resolvedModel: ResolvedModel, authPath: string = getAuthConfigPath()): Promise<ResolvedModel> => {
	if (resolvedModel.authType !== 'oauth-credentials') {
		return resolvedModel;
	}

	if (typeof resolvedModel.oauthProvider !== 'string' || typeof resolvedModel.oauthCredentials === 'undefined') {
		throw new TypeError(`Connection ${resolvedModel.connectionName} is missing OAuth credential metadata.`);
	}

	const providerCredentials = {[resolvedModel.oauthProvider]: resolvedModel.oauthCredentials};
	const oauthResult = await getOAuthApiKey(resolvedModel.oauthProvider, providerCredentials);
	if (oauthResult === null) {
		throw new TypeError(`No OAuth credentials found for ${resolvedModel.oauthProvider}. Run \`ai-ts-test-harness login ${resolvedModel.provider} --oauth\`.`);
	}

	const nextCredentials = toStoredOAuthCredentials(oauthResult.newCredentials);

	const store = loadAuthStore(authPath);
	const matchingConnection = store.connections.find((connection) => connection.id === resolvedModel.connectionId);
	if (typeof matchingConnection === 'undefined') {
		// no-op
	} else if (matchingConnection.authType === 'oauth-credentials') {
		const nextStore = upsertConnection(
			store,
			{
				id: matchingConnection.id,
				provider: matchingConnection.provider,
				name: matchingConnection.name,
				baseUrl: matchingConnection.baseUrl,
				authType: 'oauth-credentials',
				oauthProvider: matchingConnection.oauthProvider,
				oauthCredentials: nextCredentials,
				...(typeof matchingConnection.defaultModel === 'string' ? {defaultModel: matchingConnection.defaultModel} : {}),
			},
			{setAsDefault: false},
		);
		saveAuthStore(nextStore, authPath);
	}

	return {
		...resolvedModel,
		oauthCredentials: nextCredentials,
		oauthToken: oauthResult.apiKey,
	};
};

export const toExecuteRunOptions = (
	baseOptions: Omit<ExecuteRunOptions, 'ollamaUrl' | 'apiKey' | 'oauthToken' | 'model'>,
	resolvedModel: ResolvedModel,
): ExecuteRunOptions => {
	const oauthToken =
		typeof resolvedModel.oauthToken === 'string'
			? resolvedModel.oauthToken
			: resolvedModel.authType === 'oauth-credentials' && typeof resolvedModel.oauthCredentials !== 'undefined'
				? resolvedModel.oauthCredentials.access
				: undefined;

	return {
		...baseOptions,
		model: resolvedModel.modelId,
		provider: resolvedModel.provider,
		ollamaUrl: resolvedModel.baseUrl,
		...(typeof resolvedModel.apiKey === 'string' ? {apiKey: resolvedModel.apiKey} : {}),
		...(typeof oauthToken === 'string' ? {oauthToken} : {}),
	};
};

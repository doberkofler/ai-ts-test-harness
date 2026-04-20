import {type ExecuteRunOptions} from './run-execution.ts';
import {getAuthConfigPath} from './config.ts';
import {getConnectionByProvider, getDefaultConnection, loadAuthStore} from './auth-store.ts';
import {getProviderById, type ProviderId} from './provider-registry.ts';

export type ResolvedModel = {
	provider: ProviderId;
	requestedModel: string;
	resolvedModel: string;
	modelId: string;
	connectionName: string;
	baseUrl: string;
	authType: 'none' | 'api-key' | 'oauth-token';
	apiKey?: string;
	oauthToken?: string;
};

const splitProviderModel = (model: string): {provider: ProviderId; model: string} | undefined => {
	const slashIndex = model.indexOf('/');
	if (slashIndex <= 0 || slashIndex >= model.length - 1) {
		return undefined;
	}

	const providerCandidate = model.slice(0, slashIndex);
	const modelId = model.slice(slashIndex + 1);
	if (providerCandidate !== 'ollama' && providerCandidate !== 'openai' && providerCandidate !== 'openrouter') {
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

	return {
		provider,
		requestedModel,
		resolvedModel,
		modelId: resolvedModelId,
		connectionName: selectedConnection.name,
		baseUrl: selectedConnection.baseUrl,
		authType: selectedConnection.authType,
		...(selectedConnection.authType === 'api-key' ? {apiKey: selectedConnection.apiKey} : {}),
		...(selectedConnection.authType === 'oauth-token' ? {oauthToken: selectedConnection.oauthToken} : {}),
	};
};

export const toExecuteRunOptions = (
	baseOptions: Omit<ExecuteRunOptions, 'ollamaUrl' | 'apiKey' | 'oauthToken' | 'model'>,
	resolvedModel: ResolvedModel,
): ExecuteRunOptions => ({
	...baseOptions,
	model: resolvedModel.modelId,
	ollamaUrl: resolvedModel.baseUrl,
	...(typeof resolvedModel.apiKey === 'string' ? {apiKey: resolvedModel.apiKey} : {}),
	...(typeof resolvedModel.oauthToken === 'string' ? {oauthToken: resolvedModel.oauthToken} : {}),
});

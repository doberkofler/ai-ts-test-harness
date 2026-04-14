import OpenAI from 'openai';
import {DEFAULT_LLM_TIMEOUT_SECS, DEFAULT_OLLAMA_URL} from './config.ts';
import {type Problem} from './types.ts';

const clientsByUrl = new Map<string, OpenAI>();

type ChatCompletionResponse = {
	choices: {message?: {content?: string | null}}[];
};

type CompletionRequest = {
	model: string;
	temperature: number;
	messages: {role: 'user'; content: string}[];
};

type CompletionOptions = {
	timeout: number;
};

type CreateCompletion = (request: CompletionRequest, options: CompletionOptions) => Promise<ChatCompletionResponse>;

export type GenerateOptions = {
	model: string;
	ollamaUrl?: string;
	apiKey?: string;
	oauthToken?: string;
	debug?: boolean;
	llmTimeoutSecs?: number;
	createCompletion?: CreateCompletion;
};

const createCompletionForUrl = (ollamaUrl: string, authKey?: string): CreateCompletion => {
	const clientKey = `${ollamaUrl}|${authKey ?? 'ollama'}`;
	const client = clientsByUrl.get(clientKey) ?? new OpenAI({baseURL: ollamaUrl, apiKey: authKey ?? 'ollama', maxRetries: 0});
	if (!clientsByUrl.has(clientKey)) {
		clientsByUrl.set(clientKey, client);
	}

	return async (request, options) => {
		const response = await client.chat.completions.create(request, {timeout: options.timeout});
		return response;
	};
};

/*
 * Strip markdown fences models often emit
 */
const stripFences = (text: string): string =>
	text
		.replace(/^```(?:typescript|ts)?\n?/m, '')
		.replace(/\n?```$/m, '')
		.trim();

const resolveLlmTimeoutSecs = (llmTimeoutSecs: number): number => {
	if (!Number.isFinite(llmTimeoutSecs) || llmTimeoutSecs <= 0) {
		throw new TypeError(`Invalid llm timeout: ${llmTimeoutSecs}`);
	}

	return llmTimeoutSecs;
};

/*
 * Ask the model for a solution payload.
 * For implementation problems this is function code;
 * for direct-refactor problems this is transformed source code.
 */
export const generate = async (problem: Problem, options: GenerateOptions): Promise<string> => {
	const description = Array.isArray(problem.description) ? problem.description.map((line) => `- ${line}`).join('\n') : `- ${problem.description}`;

	const prompt =
		problem.kind === 'direct-refactor'
			? [
					`Refactor the following TypeScript code.`,
					`Return ONLY the refactored TypeScript code, with no markdown fences and no explanation.`,
					``,
					`Description:`,
					description,
					``,
					`Input code:`,
					problem.input,
				].join('\n')
			: [
					`Implement the following TypeScript function.`,
					`Return ONLY the function implementation, no imports, no explanation.`,
					``,
					`Description:`,
					description,
					``,
					`Signature:`,
					`${problem.signature} {`,
					`  // your implementation here`,
					`}`,
				].join('\n');

	if (options.debug === true) {
		console.log('\n[debug] LLM request');
		console.log(prompt);
	}

	const authKey = options.apiKey ?? options.oauthToken;
	const completion = options.createCompletion ?? createCompletionForUrl(options.ollamaUrl ?? DEFAULT_OLLAMA_URL, authKey);
	const llmTimeoutSecs = resolveLlmTimeoutSecs(options.llmTimeoutSecs ?? DEFAULT_LLM_TIMEOUT_SECS);
	const requestTimeoutMs = llmTimeoutSecs * 1000;

	const request: CompletionRequest = {
		model: options.model,
		temperature: 0,
		messages: [
			{
				role: 'user',
				content: prompt,
			},
		],
	};

	const res = await completion(request, {timeout: requestTimeoutMs});

	// oxlint-disable-next-line oxc/no-optional-chaining, typescript/no-unnecessary-condition
	const text = res.choices[0]?.message?.content;
	if (typeof text !== 'string') {
		throw new TypeError(`Empty response for problem: ${problem.name}`);
	}

	if (options.debug === true) {
		console.log('\n[debug] LLM response');
		console.log(text);
	}

	return stripFences(text);
};

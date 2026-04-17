import OpenAI from 'openai';
import {DEFAULT_LLM_TIMEOUT_SECS, DEFAULT_OLLAMA_URL} from './config.ts';
import {type RunPhase} from './run-phase.ts';
import {type Problem} from './types.ts';

const clientsByUrl = new Map<string, OpenAI>();
const DEBUG_SECTION_RULE = '='.repeat(72);
const DEBUG_CONTENT_RULE = '-'.repeat(72);

type ChatCompletionResponse = {
	choices: {
		message?: {
			content?: string | null;
			reasoning?: string | null;
			reasoning_content?: string | null;
		};
	}[];
};

type ChatCompletionChunk = {
	choices: {
		delta?: {
			content?: string | null;
			reasoning?: string | null;
			reasoning_content?: string | null;
		};
	}[];
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

type CreateCompletionStream = (request: CompletionRequest, options: CompletionOptions) => AsyncIterable<ChatCompletionChunk>;

export type GenerateOptions = {
	model: string;
	ollamaUrl?: string;
	apiKey?: string;
	oauthToken?: string;
	debug?: boolean;
	llmTimeoutSecs?: number;
	onPhaseChange?: (phase: RunPhase) => void;
	createCompletion?: CreateCompletion;
	createCompletionStream?: CreateCompletionStream;
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

const createCompletionStreamForUrl = (ollamaUrl: string, authKey?: string): CreateCompletionStream => {
	const clientKey = `${ollamaUrl}|${authKey ?? 'ollama'}`;
	const client = clientsByUrl.get(clientKey) ?? new OpenAI({baseURL: ollamaUrl, apiKey: authKey ?? 'ollama', maxRetries: 0});
	if (!clientsByUrl.has(clientKey)) {
		clientsByUrl.set(clientKey, client);
	}

	return async function* streamCompletionGenerator(request, options) {
		const stream = await client.chat.completions.create({...request, stream: true}, {timeout: options.timeout});
		for await (const chunk of stream) {
			yield chunk;
		}
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

const extractModelThinking = (message: {reasoning?: string | null; reasoning_content?: string | null} | undefined): string | undefined => {
	if (message && typeof message.reasoning === 'string' && message.reasoning.trim().length > 0) {
		return message.reasoning;
	}

	if (message && typeof message.reasoning_content === 'string' && message.reasoning_content.trim().length > 0) {
		return message.reasoning_content;
	}

	return undefined;
};

const createLiveLineLogger = (header: string): {push: (text: string) => void; flush: () => void} => {
	let started = false;
	let buffer = '';

	const ensureStarted = (): void => {
		if (started) {
			return;
		}

		started = true;
		console.log(`\n${DEBUG_SECTION_RULE}`);
		console.log(`[debug] ${header}`);
		console.log(DEBUG_CONTENT_RULE);
	};

	return {
		push: (text) => {
			if (text.length === 0) {
				return;
			}

			ensureStarted();
			buffer += text;

			let newlineIndex = buffer.indexOf('\n');
			while (newlineIndex >= 0) {
				const line = buffer.slice(0, newlineIndex);
				console.log(line);
				buffer = buffer.slice(newlineIndex + 1);
				newlineIndex = buffer.indexOf('\n');
			}
		},
		flush: () => {
			if (!started || buffer.length === 0) {
				if (started) {
					console.log(DEBUG_SECTION_RULE);
				}
				return;
			}

			console.log(buffer);
			console.log(DEBUG_SECTION_RULE);
			buffer = '';
		},
	};
};

const printDebugBlock = (header: string, body: string, metadata?: readonly string[]): void => {
	console.log(`\n${DEBUG_SECTION_RULE}`);
	console.log(`[debug] ${header}`);
	if (metadata) {
		for (const line of metadata) {
			console.log(`[debug] ${line}`);
		}
	}
	console.log(DEBUG_CONTENT_RULE);
	console.log(body);
	console.log(DEBUG_SECTION_RULE);
};

/*
 * Ask the model for a solution payload.
 * For implementation problems this is function code;
 * for direct-refactor problems this is transformed source code.
 */
export const generate = async (problem: Problem, options: GenerateOptions): Promise<string> => {
	const setPhase = (phase: RunPhase): void => {
		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange(phase);
		}
	};

	setPhase('thinking');

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
		printDebugBlock('LLM request', prompt, [`problem: ${problem.name}`, `model: ${options.model}`]);
	}

	const authKey = options.apiKey ?? options.oauthToken;
	const ollamaUrl = options.ollamaUrl ?? DEFAULT_OLLAMA_URL;
	const completion = options.createCompletion ?? createCompletionForUrl(ollamaUrl, authKey);
	const completionStream =
		options.createCompletionStream ?? (options.createCompletion === undefined ? createCompletionStreamForUrl(ollamaUrl, authKey) : undefined);
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

	const shouldUseStreaming = completionStream !== undefined && (options.debug === true || typeof options.onPhaseChange === 'function');

	if (shouldUseStreaming) {
		if (typeof completionStream === 'undefined') {
			throw new TypeError('Streaming completion is not available');
		}

		const debugStream = options.debug === true;
		const thinkingLogger = debugStream ? createLiveLineLogger('LLM thinking (stream)') : undefined;
		const responseLogger = debugStream ? createLiveLineLogger('LLM response (stream)') : undefined;
		let generatedCode = '';
		let markedRunning = false;

		try {
			for await (const chunk of completionStream(request, {timeout: requestTimeoutMs})) {
				const [firstChoice] = chunk.choices;
				const delta = firstChoice ? firstChoice.delta : undefined;

				const thinkingDelta =
					delta && typeof delta.reasoning === 'string'
						? delta.reasoning
						: delta && typeof delta.reasoning_content === 'string'
							? delta.reasoning_content
							: undefined;
				if (typeof thinkingDelta === 'string' && thinkingLogger) {
					thinkingLogger.push(thinkingDelta);
				}

				const responseDelta = delta && typeof delta.content === 'string' ? delta.content : undefined;
				if (typeof responseDelta === 'string') {
					if (!markedRunning) {
						setPhase('running');
						markedRunning = true;
					}

					if (responseLogger && typeof responseDelta === 'string') {
						responseLogger.push(responseDelta);
					}
					generatedCode += responseDelta;
				}
			}
		} catch {
			setPhase('running');
			const fallbackResponse = await completion(request, {timeout: requestTimeoutMs});
			const [fallbackChoice] = fallbackResponse.choices;
			const fallbackMessage = fallbackChoice && 'message' in fallbackChoice ? fallbackChoice.message : undefined;
			const fallbackText = fallbackMessage && 'content' in fallbackMessage ? fallbackMessage.content : undefined;
			if (typeof fallbackText !== 'string') {
				throw new TypeError(`Empty response for problem: ${problem.name}`);
			}

			if (options.debug === true) {
				const modelThinking = extractModelThinking(fallbackMessage);
				if (typeof modelThinking === 'string') {
					printDebugBlock('LLM thinking', modelThinking, [`problem: ${problem.name}`]);
				}
				printDebugBlock('LLM response', fallbackText, [`problem: ${problem.name}`]);
			}

			return stripFences(fallbackText);
		}

		if (!markedRunning) {
			setPhase('running');
		}

		if (debugStream) {
			if (thinkingLogger) {
				thinkingLogger.flush();
			}
			if (responseLogger) {
				responseLogger.flush();
			}
		}

		if (generatedCode.length === 0) {
			throw new TypeError(`Empty response for problem: ${problem.name}`);
		}

		return stripFences(generatedCode);
	}

	setPhase('running');
	const res = await completion(request, {timeout: requestTimeoutMs});

	const [firstChoice] = res.choices;
	const message = firstChoice && 'message' in firstChoice ? firstChoice.message : undefined;
	const text = message && 'content' in message ? message.content : undefined;
	if (typeof text !== 'string') {
		throw new TypeError(`Empty response for problem: ${problem.name}`);
	}

	if (options.debug === true) {
		const modelThinking = extractModelThinking(message);
		if (typeof modelThinking === 'string') {
			printDebugBlock('LLM thinking', modelThinking, [`problem: ${problem.name}`]);
		}

		printDebugBlock('LLM response', text, [`problem: ${problem.name}`]);
	}

	return stripFences(text);
};

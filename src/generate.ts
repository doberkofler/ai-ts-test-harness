import OpenAI from 'openai';
import {getModels as getPiModels, getProviders as getPiProviders, streamSimple, type Context, type KnownProvider} from '@mariozechner/pi-ai';
import {z} from 'zod';
import {DEFAULT_LLM_TIMEOUT_SECS, DEFAULT_OLLAMA_URL} from './config.ts';
import {type RunPhase} from './run-phase.ts';
import {type RunTransferStats} from './run-transfer.ts';
import {type ChangedFilesArtifact, type Problem, type WorkspaceFile} from './types.ts';

const clientsByUrl = new Map<string, OpenAI>();
const DEBUG_SECTION_RULE = '='.repeat(72);
const DEBUG_CONTENT_RULE = '-'.repeat(72);

const changedFilesArtifactSchema = z.object({
	kind: z.literal('changed-files-v1'),
	files: z.array(
		z.object({
			path: z.string().min(1),
			content: z.string(),
		}),
	),
});

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
	max_completion_tokens: number;
	messages: {role: 'user'; content: string}[];
};

type CompletionOptions = {
	timeout: number;
	signal?: AbortSignal;
};

type CreateCompletion = (request: CompletionRequest, options: CompletionOptions) => Promise<ChatCompletionResponse>;

type CreateCompletionStream = (request: CompletionRequest, options: CompletionOptions) => AsyncIterable<ChatCompletionChunk>;

export type GenerateOptions = {
	model: string;
	provider?: string;
	ollamaUrl?: string;
	apiKey?: string;
	oauthToken?: string;
	debug?: boolean;
	llmTimeoutSecs?: number;
	onPhaseChange?: (phase: RunPhase) => void;
	onTransferProgress?: (stats: RunTransferStats) => void;
	onThinkingDelta?: (thinkingDelta: string) => void;
	createCompletion?: CreateCompletion;
	createCompletionStream?: CreateCompletionStream;
};

const knownPiProviders = new Set<KnownProvider>(getPiProviders());

const isKnownPiProvider = (provider: string): provider is KnownProvider => {
	for (const knownProvider of knownPiProviders) {
		if (knownProvider === provider) {
			return true;
		}
	}

	return false;
};

const createCompletionForUrl = (ollamaUrl: string, authKey?: string): CreateCompletion => {
	const clientKey = `${ollamaUrl}|${authKey ?? 'ollama'}`;
	const client = clientsByUrl.get(clientKey) ?? new OpenAI({baseURL: ollamaUrl, apiKey: authKey ?? 'ollama', maxRetries: 0});
	if (!clientsByUrl.has(clientKey)) {
		clientsByUrl.set(clientKey, client);
	}

	return async (request, options) => {
		const response = await client.chat.completions.create(request, {timeout: options.timeout, signal: options.signal});
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
		const stream = await client.chat.completions.create({...request, stream: true}, {timeout: options.timeout, signal: options.signal});
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
		.replace(/^```(?:json|typescript|ts)?\n?/m, '')
		.replace(/\n?```$/m, '')
		.trim();

const renderWorkspace = (files: readonly WorkspaceFile[]): string =>
	files.map((file) => [`--- FILE: ${file.path} ---`, file.content, `--- END FILE ---`].join('\n')).join('\n\n');

const parseArtifact = (responseText: string, fallbackPath: string): ChangedFilesArtifact => {
	const cleaned = stripFences(responseText);
	try {
		const parsedJson: unknown = JSON.parse(cleaned);
		return changedFilesArtifactSchema.parse(parsedJson);
	} catch {
		return {
			kind: 'changed-files-v1',
			files: [{path: fallbackPath, content: cleaned}],
		};
	}
};

const resolveLlmTimeoutSecs = (llmTimeoutSecs: number): number => {
	if (!Number.isFinite(llmTimeoutSecs) || llmTimeoutSecs <= 0) {
		throw new TypeError(`Invalid llm timeout: ${llmTimeoutSecs}`);
	}

	return llmTimeoutSecs;
};

const TIMEOUT_ERROR_MESSAGE = 'Request timed out.';
const DEFAULT_MAX_COMPLETION_TOKENS = 8192;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const readErrorStringField = (error: unknown, field: 'name' | 'code' | 'type' | 'message'): string | undefined => {
	if (!isRecord(error)) {
		return undefined;
	}

	const raw = error[field];
	return typeof raw === 'string' ? raw : undefined;
};

const isTimeoutLikeError = (error: unknown): boolean => {
	const message = readErrorStringField(error, 'message') ?? (error instanceof Error ? error.message : String(error));
	const name = readErrorStringField(error, 'name') ?? (error instanceof Error ? error.name : undefined);
	const code = readErrorStringField(error, 'code');
	const type = readErrorStringField(error, 'type');

	if (typeof code === 'string' && /timed?out|abort/i.test(code)) {
		return true;
	}

	if (typeof type === 'string' && /timed?out|abort/i.test(type)) {
		return true;
	}

	if (typeof name === 'string' && /timeout|abort/i.test(name)) {
		return true;
	}

	return /timed?\s*out|abort/i.test(message);
};

const isStreamingUnsupportedError = (error: unknown): boolean => {
	const message = readErrorStringField(error, 'message') ?? (error instanceof Error ? error.message : String(error));
	const mentionsStream = /stream/i.test(message);
	const mentionsUnsupported = /unsupported|not\s+supported|not\s+support|disabled/i.test(message);
	return mentionsStream && mentionsUnsupported;
};

const normalizeTimeoutError = (error: unknown): never => {
	if (isTimeoutLikeError(error)) {
		throw new Error(TIMEOUT_ERROR_MESSAGE, {cause: error});
	}

	throw error;
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

const hasResponseContentOutsideThinkTags = (text: string): boolean => {
	const withoutClosedThinkBlocks = text.replaceAll(/<think>[\s\S]*?<\/think>/g, '');
	const withoutOpenThinkTail = withoutClosedThinkBlocks.replaceAll(/<think>[\s\S]*$/g, '');
	const withoutStandaloneTags = withoutOpenThinkTail.replaceAll(/<\/?think>/g, '');
	return withoutStandaloneTags.trim().length > 0;
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

const extractTextFromPiMessage = (message: {content: readonly {type: string; text?: string; thinking?: string}[]}): {text: string; thinking: string} => {
	let text = '';
	let thinking = '';
	for (const part of message.content) {
		if (part.type === 'text' && typeof part.text === 'string') {
			text += part.text;
		}
		if (part.type === 'thinking' && typeof part.thinking === 'string') {
			thinking += part.thinking;
		}
	}

	return {text, thinking};
};

type PiGenerateArgs = {
	provider: KnownProvider;
	problem: Problem;
	prompt: string;
	fallbackPath: string;
	options: GenerateOptions;
	authKey?: string;
	setPhase: (phase: RunPhase) => void;
	setTransferProgress: (stats: RunTransferStats) => void;
	pushThinkingDelta: (thinkingDelta: string) => void;
	remainingTimeoutMs: () => number;
	deadlineMs: number;
};

const generateViaPiProvider = async (args: PiGenerateArgs): Promise<ChangedFilesArtifact> => {
	const models = getPiModels(args.provider);
	const model = models.find((entry) => entry.id === args.options.model);
	if (typeof model === 'undefined') {
		throw new TypeError(`Model ${args.provider}/${args.options.model} is not available.`);
	}

	const resolvedModel =
		typeof args.options.ollamaUrl === 'string' && args.options.ollamaUrl.trim().length > 0 && model.baseUrl !== args.options.ollamaUrl
			? {...model, baseUrl: args.options.ollamaUrl.trim()}
			: model;

	const promptChars = args.prompt.length;
	let responseChars = 0;
	args.setTransferProgress({promptChars, responseChars});

	const markResponseChars = (deltaChars: number): void => {
		if (deltaChars <= 0) {
			return;
		}

		responseChars += deltaChars;
		args.setTransferProgress({promptChars, responseChars});
	};

	const debugStream = args.options.debug === true;
	const thinkingLogger = debugStream ? createLiveLineLogger('LLM thinking (stream)') : undefined;
	const responseLogger = debugStream ? createLiveLineLogger('LLM response (stream)') : undefined;

	const context: Context = {
		systemPrompt: 'You are a precise coding assistant. Follow the user request exactly and return only the requested output.',
		messages: [
			{
				role: 'user',
				content: args.prompt,
				timestamp: Date.now(),
			},
		],
	};

	let generatedCode = '';
	let markedRunning = false;
	let responsePhaseProbe = '';

	try {
		for await (const event of streamSimple(resolvedModel, context, {
			...(typeof args.authKey === 'string' ? {apiKey: args.authKey} : {}),
			signal: AbortSignal.timeout(args.remainingTimeoutMs()),
		})) {
			if (Date.now() > args.deadlineMs) {
				throw new Error(TIMEOUT_ERROR_MESSAGE, {cause: new Error('Request exceeded configured timeout window')});
			}

			if (event.type === 'thinking_delta') {
				if (thinkingLogger) {
					thinkingLogger.push(event.delta);
				}
				args.pushThinkingDelta(event.delta);
				markResponseChars(event.delta.length);
			}

			if (event.type === 'text_delta') {
				if (!markedRunning) {
					responsePhaseProbe = `${responsePhaseProbe}${event.delta}`;
					if (responsePhaseProbe.length > 512) {
						responsePhaseProbe = responsePhaseProbe.slice(-512);
					}

					if (hasResponseContentOutsideThinkTags(responsePhaseProbe)) {
						args.setPhase('running');
						markedRunning = true;
					}
				}

				if (responseLogger) {
					responseLogger.push(event.delta);
				}
				generatedCode += event.delta;
				markResponseChars(event.delta.length);
			}

			if (event.type === 'error') {
				const fallbackError = `Empty response for problem: ${args.problem.name}`;
				throw new TypeError(event.error.errorMessage ?? fallbackError);
			}

			if (event.type === 'done' && generatedCode.length === 0) {
				const {text, thinking} = extractTextFromPiMessage(event.message);
				if (thinking.length > 0) {
					args.pushThinkingDelta(thinking);
					markResponseChars(thinking.length);
				}
				if (text.length > 0) {
					if (!markedRunning && hasResponseContentOutsideThinkTags(text)) {
						args.setPhase('running');
						markedRunning = true;
					}
					if (responseLogger) {
						responseLogger.push(text);
					}
					generatedCode = text;
					markResponseChars(text.length);
				}
			}
		}
	} finally {
		if (debugStream) {
			if (thinkingLogger) {
				thinkingLogger.flush();
			}
			if (responseLogger) {
				responseLogger.flush();
			}
		}
	}

	if (!markedRunning) {
		args.setPhase('running');
	}

	if (generatedCode.length === 0) {
		throw new TypeError(`Empty response for problem: ${args.problem.name}`);
	}

	return parseArtifact(generatedCode, args.fallbackPath);
};

/*
 * Ask the model for a solution payload.
 * For implementation problems this is function code;
 * for direct-refactor problems this is transformed source code.
 */
export const generate = async (problem: Problem, options: GenerateOptions): Promise<ChangedFilesArtifact> => {
	const llmTimeoutSecs = resolveLlmTimeoutSecs(
		typeof problem.llm_timeout === 'number' && Number.isFinite(problem.llm_timeout)
			? problem.llm_timeout
			: (options.llmTimeoutSecs ?? DEFAULT_LLM_TIMEOUT_SECS),
	);
	const workspaceFiles = Array.isArray(problem.files) ? problem.files : [];
	const description = Array.isArray(problem.description) ? problem.description.join(' ') : problem.description;
	const setPhase = (phase: RunPhase): void => {
		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange(phase);
		}
	};
	const setTransferProgress = (stats: RunTransferStats): void => {
		if (typeof options.onTransferProgress === 'function') {
			options.onTransferProgress(stats);
		}
	};
	const pushThinkingDelta = (thinkingDelta: string): void => {
		if (typeof options.onThinkingDelta === 'function') {
			options.onThinkingDelta(thinkingDelta);
		}
	};

	setPhase('thinking');

	const targetFiles = workspaceFiles.filter((f) => f.path !== 'original.ts');
	const isSingleFile = targetFiles.length === 1;
	const [firstTargetFile] = targetFiles;
	const fallbackPath = firstTargetFile ? firstTargetFile.path : 'solution.ts';

	const prompt =
		isSingleFile && firstTargetFile
			? [
					`You are working in a TypeScript workspace benchmark.`,
					`Apply the requested changes to the following file: ${fallbackPath}`,
					`Return ONLY the valid TypeScript code for this file.`,
					`Do not include markdown fences or any explanation.`,
					``,
					`Problem: ${problem.category}/${problem.name}`,
					`Description: ${description}`,
					``,
					`Initial file content:`,
					firstTargetFile.content,
				].join('\n')
			: [
					`You are working in a TypeScript workspace benchmark.`,
					`Apply the requested changes to the provided files.`,
					`Return ONLY valid JSON matching this exact schema:`,
					`{`,
					`  "kind": "changed-files-v1",`,
					`  "files": [{"path": "relative/path.ts", "content": "full file content"}]`,
					`}`,
					`Do not include markdown fences, prose, or extra keys.`,
					``,
					`Problem: ${problem.category}/${problem.name}`,
					`Description: ${description}`,
					`LLM timeout (s): ${llmTimeoutSecs}`,
					``,
					`Initial files:`,
					renderWorkspace(targetFiles),
				].join('\n');

	if (options.debug === true) {
		printDebugBlock('LLM request', prompt, [`problem: ${problem.name}`, `model: ${options.model}`]);
	}

	const authKey = options.apiKey ?? options.oauthToken;
	const requestTimeoutMs = llmTimeoutSecs * 1000;
	const deadlineMs = Date.now() + requestTimeoutMs;
	const remainingTimeoutMs = (): number => {
		const remaining = deadlineMs - Date.now();
		if (remaining <= 0) {
			throw new Error(TIMEOUT_ERROR_MESSAGE, {cause: new Error('Request exceeded configured timeout window')});
		}

		return remaining;
	};

	if (typeof options.provider === 'string' && options.provider !== 'ollama' && isKnownPiProvider(options.provider)) {
		try {
			return await generateViaPiProvider({
				provider: options.provider,
				problem,
				prompt,
				fallbackPath,
				options,
				...(typeof authKey === 'string' ? {authKey} : {}),
				setPhase,
				setTransferProgress,
				pushThinkingDelta,
				remainingTimeoutMs,
				deadlineMs,
			});
		} catch (error) {
			normalizeTimeoutError(error);
		}
	}

	const ollamaUrl = options.ollamaUrl ?? DEFAULT_OLLAMA_URL;
	const completion = options.createCompletion ?? createCompletionForUrl(ollamaUrl, authKey);
	const completionStream =
		options.createCompletionStream ?? (options.createCompletion === undefined ? createCompletionStreamForUrl(ollamaUrl, authKey) : undefined);

	const request: CompletionRequest = {
		model: options.model,
		temperature: 0,
		max_completion_tokens: DEFAULT_MAX_COMPLETION_TOKENS,
		messages: [
			{
				role: 'user',
				content: prompt,
			},
		],
	};

	const promptChars = prompt.length;
	let responseChars = 0;
	setTransferProgress({promptChars, responseChars});

	const markResponseChars = (deltaChars: number): void => {
		if (deltaChars <= 0) {
			return;
		}

		responseChars += deltaChars;
		setTransferProgress({promptChars, responseChars});
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
		let responsePhaseProbe = '';

		try {
			for await (const chunk of completionStream(request, {timeout: remainingTimeoutMs(), signal: AbortSignal.timeout(remainingTimeoutMs())})) {
				if (Date.now() > deadlineMs) {
					throw new Error(TIMEOUT_ERROR_MESSAGE, {cause: new Error('Request exceeded configured timeout window')});
				}

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
				if (typeof thinkingDelta === 'string') {
					pushThinkingDelta(thinkingDelta);
					markResponseChars(thinkingDelta.length);
				}

				const responseDelta = delta && typeof delta.content === 'string' ? delta.content : undefined;
				if (typeof responseDelta === 'string') {
					if (!markedRunning) {
						responsePhaseProbe = `${responsePhaseProbe}${responseDelta}`;
						if (responsePhaseProbe.length > 512) {
							responsePhaseProbe = responsePhaseProbe.slice(-512);
						}

						if (hasResponseContentOutsideThinkTags(responsePhaseProbe)) {
							setPhase('running');
							markedRunning = true;
						}
					}

					if (responseLogger && typeof responseDelta === 'string') {
						responseLogger.push(responseDelta);
					}
					generatedCode += responseDelta;
					markResponseChars(responseDelta.length);
				}
			}

			if (Date.now() > deadlineMs) {
				throw new Error(TIMEOUT_ERROR_MESSAGE, {cause: new Error('Request exceeded configured timeout window')});
			}
		} catch (error) {
			if (isTimeoutLikeError(error)) {
				normalizeTimeoutError(error);
			}

			if (!isStreamingUnsupportedError(error)) {
				throw error;
			}

			const fallbackResponse = await completion(request, {timeout: remainingTimeoutMs(), signal: AbortSignal.timeout(remainingTimeoutMs())}).catch(
				(fallbackError: unknown) => normalizeTimeoutError(fallbackError),
			);

			const [fallbackChoice] = fallbackResponse.choices;
			const fallbackMessage = fallbackChoice && 'message' in fallbackChoice ? fallbackChoice.message : undefined;
			const fallbackText = fallbackMessage && 'content' in fallbackMessage ? fallbackMessage.content : undefined;
			if (typeof fallbackText !== 'string') {
				throw new TypeError(`Empty response for problem: ${problem.name}`, {cause: error});
			}

			const fallbackThinking = extractModelThinking(fallbackMessage);
			if (typeof fallbackThinking === 'string') {
				pushThinkingDelta(fallbackThinking);
				markResponseChars(fallbackThinking.length);
			}
			markResponseChars(fallbackText.length);
			setPhase('running');

			if (options.debug === true) {
				if (typeof fallbackThinking === 'string') {
					printDebugBlock('LLM thinking', fallbackThinking, [`problem: ${problem.name}`]);
				}
				printDebugBlock('LLM response', fallbackText, [`problem: ${problem.name}`]);
			}

			return parseArtifact(fallbackText, fallbackPath);
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
			const fallbackResponse = await completion(request, {timeout: remainingTimeoutMs(), signal: AbortSignal.timeout(remainingTimeoutMs())}).catch(
				(fallbackError: unknown) => normalizeTimeoutError(fallbackError),
			);

			const [fallbackChoice] = fallbackResponse.choices;
			const fallbackMessage = fallbackChoice && 'message' in fallbackChoice ? fallbackChoice.message : undefined;
			const fallbackText = fallbackMessage && 'content' in fallbackMessage ? fallbackMessage.content : undefined;
			if (typeof fallbackText !== 'string') {
				throw new TypeError(`Empty response for problem: ${problem.name}`);
			}

			const fallbackThinking = extractModelThinking(fallbackMessage);
			if (typeof fallbackThinking === 'string') {
				pushThinkingDelta(fallbackThinking);
				markResponseChars(fallbackThinking.length);
			}
			markResponseChars(fallbackText.length);
			setPhase('running');

			if (options.debug === true) {
				if (typeof fallbackThinking === 'string') {
					printDebugBlock('LLM thinking', fallbackThinking, [`problem: ${problem.name}`]);
				}
				printDebugBlock('LLM response', fallbackText, [`problem: ${problem.name}`]);
			}

			return parseArtifact(fallbackText, fallbackPath);
		}

		return parseArtifact(generatedCode, fallbackPath);
	}

	const res = await completion(request, {timeout: remainingTimeoutMs(), signal: AbortSignal.timeout(remainingTimeoutMs())}).catch((error: unknown) =>
		normalizeTimeoutError(error),
	);

	const [firstChoice] = res.choices;
	const message = firstChoice && 'message' in firstChoice ? firstChoice.message : undefined;
	const text = message && 'content' in message ? message.content : undefined;
	if (typeof text !== 'string') {
		throw new TypeError(`Empty response for problem: ${problem.name}`);
	}

	const modelThinking = extractModelThinking(message);
	if (typeof modelThinking === 'string') {
		pushThinkingDelta(modelThinking);
		markResponseChars(modelThinking.length);
	}
	markResponseChars(text.length);
	setPhase('running');

	if (options.debug === true) {
		if (typeof modelThinking === 'string') {
			printDebugBlock('LLM thinking', modelThinking, [`problem: ${problem.name}`]);
		}

		printDebugBlock('LLM response', text, [`problem: ${problem.name}`]);
	}

	return parseArtifact(text, fallbackPath);
};

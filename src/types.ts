export type AssertApi = {
	strictEqual: (actual: unknown, expected: unknown, message?: string | Error) => void;
	deepStrictEqual: (actual: unknown, expected: unknown, message?: string | Error) => void;
	notStrictEqual: (actual: unknown, expected: unknown, message?: string | Error) => void;
	match: (actual: string, expected: RegExp, message?: string | Error) => void;
	doesNotMatch: (actual: string, expected: RegExp, message?: string | Error) => void;
	ok: (value: unknown, message?: string | Error) => void;
	throws: (block: () => unknown, error?: RegExp | ((error: unknown) => boolean), message?: string | Error) => void;
	rejects: (block: (() => Promise<unknown>) | Promise<unknown>, error?: RegExp | ((error: unknown) => boolean), message?: string | Error) => Promise<void>;
	fail: (message?: string | Error) => never;
};

export type WorkspaceFile = {
	path: string;
	content: string;
};

export type ImplementProblemSolutionCallback = (...args: readonly never[]) => unknown;

export type DirectRefactorProblemSolutionCallback = (input: string) => string;

export type ChangedFilesArtifact = {
	kind: 'changed-files-v1';
	files: WorkspaceFile[];
};

export type Problem = {
	name: string;
	category: string;
	description: string | string[];
	llm_timeout?: number;
	files?: WorkspaceFile[];
	tests: WorkspaceFile[];
	solution?: ChangedFilesArtifact | ImplementProblemSolutionCallback | DirectRefactorProblemSolutionCallback;
	kind?: 'implement-function' | 'direct-refactor';
	signature?: string;
	input?: string;
	entry?: string;
};

/** Result of running one problem */
export type Result = {
	problem: string;
	category: string;
	program?: string;
	artifact?: ChangedFilesArtifact;
	thinking?: string;
	passed: boolean;
	error?: string;
	duration_ms: number;
};

export type RuntimeConfig = {
	model: string;
	debug: boolean;
	storeThinking?: boolean;
	llmTimeoutSecs: number;
	vitestTimeoutSecs: number;
	noCooldown?: boolean;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
	selectedCategories?: string[];
	systemInfo?: SystemInfo;
};

export type SystemInfo = {
	hostname: string;
	os: string;
	cpu: string;
	ram_gb: number;
	gpu?: string;
};

export type ResultsFile = {
	generated_at: string;
	model: string;
	ollama_url?: string;
	llm_timeout_secs?: number;
	vitest_timeout_secs?: number;
	selected_categories?: string[];
	system_info?: SystemInfo;
	results: Result[];
};

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

export type FailureKind = 'timeout' | 'assertion' | 'runtime' | 'vitest' | 'other';

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
export type LlmMetrics = {
	llm_duration_ms: number;
	tokens_sent: number;
	tokens_received: number;
	average_tokens_per_second: number;
};

export type ProblemExecutionResult = {
	problem: string;
	category: string;
	program?: string;
	artifact?: ChangedFilesArtifact;
	tested_workspace?: ChangedFilesArtifact;
	tests_snapshot?: WorkspaceFile[];
	passed: boolean;
	error?: string;
	failure_kind?: FailureKind;
};

export type Result = {
	problem: ProblemExecutionResult['problem'];
	category: ProblemExecutionResult['category'];
	program?: ProblemExecutionResult['program'];
	artifact?: ProblemExecutionResult['artifact'];
	tested_workspace?: ProblemExecutionResult['tested_workspace'];
	tests_snapshot?: ProblemExecutionResult['tests_snapshot'];
	reference_solution?: ChangedFilesArtifact;
	thinking?: string;
	passed: ProblemExecutionResult['passed'];
	error?: ProblemExecutionResult['error'];
	failure_kind?: ProblemExecutionResult['failure_kind'];
	llm_metrics: LlmMetrics;
};

export type RuntimeConfig = {
	model: string;
	provider?: string;
	connection?: string;
	authType?: 'none' | 'api-key' | 'oauth-token' | 'oauth-credentials';
	debug: boolean;
	storeThinking?: boolean;
	compress?: boolean;
	overwriteResults?: boolean;
	llmTimeoutSecs: number;
	vitestTimeoutSecs: number;
	cooldownTempThreshold?: number;
	ollamaUrl: string;
	selectedCategories?: string[];
	systemInfo?: SystemInfo;
};

export type SystemInfo = {
	hostname: string;
	os: string;
	cpu: string;
	ram_gb: number;
	gpu?: string;
	cpu_temp?: number;
	gpu_temp?: number;
};

export type ResultsFile = {
	generated_at: string;
	model: string;
	provider?: string;
	connection?: string;
	auth_type?: 'none' | 'api-key' | 'oauth-token' | 'oauth-credentials';
	ollama_url?: string;
	llm_timeout_secs?: number;
	vitest_timeout_secs?: number;
	selected_categories?: string[];
	system_info?: SystemInfo;
	results: Result[];
};

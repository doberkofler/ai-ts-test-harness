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

type ProblemBase = {
	/** Unique identifier */
	name: string;
	/** Problem category used for filtering/reporting */
	category: string;
	/** Natural language description sent to the model */
	description: string | string[];
};

export type ImplementProblemSolutionCallback = (...args: readonly never[]) => unknown;

export type DirectRefactorProblemSolutionCallback = (input: string) => string;

export type ImplementProblemTestContext = {
	assert: AssertApi;
	implementation: (...args: readonly unknown[]) => unknown;
	code: {result: string};
};

export type DirectRefactorProblemTestContext = {
	assert: AssertApi;
	original: (...args: readonly unknown[]) => unknown;
	transformed: (...args: readonly unknown[]) => unknown;
	code: {input: string; result: string};
};

export type ImplementProblemTestCallback = (context: ImplementProblemTestContext) => void | Promise<void>;

export type DirectRefactorProblemTestCallback = (context: DirectRefactorProblemTestContext) => void | Promise<void>;

export type ProblemTests = ImplementProblemTestCallback | DirectRefactorProblemTestCallback;

/** Function-implementation benchmark */
export type ImplementFunctionProblem = ProblemBase & {
	kind?: 'implement-function';
	/** Full function signature — model must implement this */
	signature: string;
	/** Optional precomputed solution to the problem */
	solution?: ImplementProblemSolutionCallback;
	/** Test body callback */
	tests: ImplementProblemTestCallback;
};

/** Direct refactoring benchmark */
export type DirectRefactorProblem = ProblemBase & {
	kind: 'direct-refactor';
	/** Source code provided to the model for transformation */
	input: string;
	/** Function identifier used for behavior-equivalence checks */
	entry: string;
	/** Optional precomputed source transformation for validation */
	solution?: DirectRefactorProblemSolutionCallback;
	/** Test body callback */
	tests: DirectRefactorProblemTestCallback;
};

/** A single benchmark problem */
export type Problem = ImplementFunctionProblem | DirectRefactorProblem;

/** Result of running one problem */
export type Result = {
	problem: string;
	category: string;
	program: string;
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
	cooldownPeriodSecs?: number;
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
	selected_categories?: string[];
	system_info?: SystemInfo;
	results: Result[];
};

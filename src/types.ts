import type assert from 'node:assert';

type ProblemBase = {
	/** Unique identifier */
	name: string;
	/** Problem category used for filtering/reporting */
	category: string;
	/** Natural language description sent to the model */
	description: string[];
	/** Test body as assertion lines or callback */
	tests: ProblemTests;
};

export type ImplementProblemTestContext = {
	assert: typeof assert;
	implementation: unknown;
	code: {result: string};
};

export type DirectRefactorProblemTestContext = {
	assert: typeof assert;
	original: unknown;
	transformed: unknown;
	code: {input: string; result: string};
};

export type ProblemTestCallback = (context: {
	assert: typeof assert;
	implementation?: unknown;
	original?: unknown;
	transformed?: unknown;
	code: {result: string; input?: string};
}) => void;

export type ProblemTests = string | ProblemTestCallback;

/** Function-implementation benchmark */
export type ImplementFunctionProblem = ProblemBase & {
	kind?: 'implement-function';
	/** Full function signature — model must implement this */
	signature: string;
};

/** Direct refactoring benchmark */
export type DirectRefactorProblem = ProblemBase & {
	kind: 'direct-refactor';
	/** Source code provided to the model for transformation */
	input: string;
	/** Function identifier used for behavior-equivalence checks */
	entry: string;
};

/** A single benchmark problem */
export type Problem = ImplementFunctionProblem | DirectRefactorProblem;

/** Result of running one problem */
export type Result = {
	problem: string;
	category: string;
	program: string;
	passed: boolean;
	error?: string;
	duration_ms: number;
};

export type RuntimeConfig = {
	model: string;
	debug: boolean;
	timeoutMs: number;
	ollamaUrl: string;
	apiKey?: string;
	oauthToken?: string;
	selectedCategories?: string[];
};

export type ResultsFile = {
	generated_at: string;
	model: string;
	ollama_url: string;
	llm_timeout_ms: number;
	debug: boolean;
	selected_categories?: string[];
	total: number;
	passed: number;
	failed: number;
	pass_rate_percent: number;
	results: Result[];
};

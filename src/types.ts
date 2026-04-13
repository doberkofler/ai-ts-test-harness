type ProblemBase = {
	/** Unique identifier */
	name: string;
	/** Problem category used for filtering/reporting */
	category: string;
	/** Natural language description sent to the model */
	description: string[];
	/** assert.strictEqual / assert.deepStrictEqual calls, one per line */
	tests: string;
};

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

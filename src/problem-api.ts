import {
	type DirectRefactorProblem,
	type DirectRefactorProblemSolutionCallback,
	type DirectRefactorProblemTestCallback,
	type ImplementFunctionProblem,
	type ImplementProblemSolutionCallback,
	type ImplementProblemTestCallback,
} from './types.ts';

type ImplementProblemInput = {
	name: string;
	category: string;
	description: string | string[];
	signature: string;
	solution?: ImplementProblemSolutionCallback;
	tests: ImplementProblemTestCallback;
};

type RefactorProblemInput = {
	name: string;
	category: string;
	description: string | string[];
	input: string;
	entry: string;
	solution?: DirectRefactorProblemSolutionCallback;
	tests: DirectRefactorProblemTestCallback;
};

export const defineImplementProblem = (input: ImplementProblemInput): ImplementFunctionProblem => ({
	...input,
	kind: 'implement-function',
});

export const defineRefactorProblem = (input: RefactorProblemInput): DirectRefactorProblem => ({
	...input,
	kind: 'direct-refactor',
});

import {
	type DirectRefactorProblemSolutionCallback,
	type DirectRefactorProblemTestCallback,
	type ImplementProblemSolutionCallback,
	type ImplementProblemTestCallback,
} from './types.ts';

type ImplementProblemInput = {
	name: string;
	description: string | string[];
	signature: string;
	solution?: ImplementProblemSolutionCallback;
	tests: ImplementProblemTestCallback;
};

type RefactorProblemInput = {
	name: string;
	description: string | string[];
	input: string;
	entry: string;
	solution?: DirectRefactorProblemSolutionCallback;
	tests: DirectRefactorProblemTestCallback;
};

export const defineImplementProblem = (input: ImplementProblemInput): ImplementProblemInput & {kind: 'implement-function'} => ({
	...input,
	kind: 'implement-function',
});

export const defineRefactorProblem = (input: RefactorProblemInput): RefactorProblemInput & {kind: 'direct-refactor'} => ({
	...input,
	kind: 'direct-refactor',
});

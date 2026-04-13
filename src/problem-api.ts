import {type DirectRefactorProblem, type ImplementFunctionProblem, type ProblemTests} from './types.ts';

type ImplementProblemInput = {
	name: string;
	category: string;
	description: string[];
	signature: string;
	tests: ProblemTests;
};

type RefactorProblemInput = {
	name: string;
	category: string;
	description: string[];
	input: string;
	entry: string;
	tests: ProblemTests;
};

export const defineImplementProblem = (input: ImplementProblemInput): ImplementFunctionProblem => ({
	...input,
	kind: 'implement-function',
});

export const defineRefactorProblem = (input: RefactorProblemInput): DirectRefactorProblem => ({
	...input,
	kind: 'direct-refactor',
});

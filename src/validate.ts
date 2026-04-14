import {loadProblems} from './load-problems.ts';
import {parseCategoryFilter, selectProblemsByFilters} from './core/problem-selection.ts';
import {parseFunctionNameFromSignature} from './core/signature.ts';
import {runProblem} from './runner.ts';
import {type Problem} from './types.ts';

const createInvalidSolution = (problem: Problem): string => {
	if (problem.kind === 'direct-refactor') {
		return problem.input;
	}

	const functionName = parseFunctionNameFromSignature(problem.signature);
	return `function ${functionName}(): unknown { return undefined; }`;
};

const formatFailure = (problemName: string, issue: string): string => `- ${problemName}: ${issue}`;

const hasSolution = (problem: Problem): problem is Problem & {solution: NonNullable<Problem['solution']>} => typeof problem.solution === 'function';

const createProvidedSolution = (problem: Problem): string => {
	if (typeof problem.solution !== 'function') {
		throw new TypeError(`Problem "${problem.name}" is missing a solution callback`);
	}

	if (problem.kind === 'direct-refactor') {
		return problem.solution(problem.input);
	}

	return problem.solution.toString();
};

export type ValidateCommandOptions = {
	test: string | undefined;
	category: string | undefined;
	debug: boolean;
	loadProblemsFn?: typeof loadProblems;
	runProblemFn?: typeof runProblem;
};

export const validateCommand = async (options: ValidateCommandOptions): Promise<void> => {
	const allProblems = (options.loadProblemsFn ?? loadProblems)('./src/problems');
	const selectedCategories = parseCategoryFilter(options.category);
	const selectedProblems = selectProblemsByFilters(allProblems, options.test, selectedCategories);
	const problemsWithSolutions = selectedProblems.filter((problem) => hasSolution(problem));

	let checks = 0;
	const failures: string[] = [];

	for (const problem of problemsWithSolutions) {
		const solution = createProvidedSolution(problem);
		checks += 1;
		// oxlint-disable-next-line no-await-in-loop
		const solutionResult = await (options.runProblemFn ?? runProblem)(problem, solution, {debug: options.debug});
		if (!solutionResult.passed) {
			failures.push(formatFailure(problem.name, `provided solution failed tests (${solutionResult.error ?? 'unknown error'})`));
		}

		checks += 1;
		// oxlint-disable-next-line no-await-in-loop
		const invalidResult = await (options.runProblemFn ?? runProblem)(problem, createInvalidSolution(problem), {debug: options.debug});
		if (invalidResult.passed) {
			failures.push(formatFailure(problem.name, 'tests accepted an intentionally invalid solution'));
		}
	}

	if (failures.length > 0) {
		throw new Error(`Problem validation failed:\n${failures.join('\n')}`);
	}

	console.log(`Validation passed for ${problemsWithSolutions.length}/${selectedProblems.length} problems with solutions (${checks} checks).`);
};

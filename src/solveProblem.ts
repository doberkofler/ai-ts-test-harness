import {generate, type GenerateOptions} from './generate.ts';
import {runProblem} from './runner.ts';
import {type Problem, type Result} from './types.ts';

export const solveProblem = async (problem: Problem, options: GenerateOptions): Promise<Result> => {
	const start = Date.now();

	try {
		// oxlint-disable-next-line no-await-in-loop
		const code = await generate(problem, options);

		// oxlint-disable-next-line no-await-in-loop
		const result = await runProblem(problem, code, {debug: options.debug ?? false});

		return result;
	} catch (error) {
		const errorText = error instanceof Error ? error.message : String(error);

		return {
			problem: problem.name,
			category: problem.category,
			program: '',
			passed: false,
			error: errorText,
			duration_ms: Date.now() - start,
		};
	}
};

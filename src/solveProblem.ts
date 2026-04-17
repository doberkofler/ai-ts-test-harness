import {generate, type GenerateOptions} from './generate.ts';
import {type RunPhase} from './run-phase.ts';
import {runProblem} from './runner.ts';
import {type Problem, type Result} from './types.ts';

export type SolveProblemOptions = GenerateOptions & {
	onPhaseChange?: (phase: RunPhase) => void;
};

export const solveProblem = async (problem: Problem, options: SolveProblemOptions): Promise<Result> => {
	const start = Date.now();

	try {
		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange('thinking');
		}
		// oxlint-disable-next-line no-await-in-loop
		const code = await generate(problem, options);

		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange('testing');
		}
		// oxlint-disable-next-line no-await-in-loop
		const result = await runProblem(problem, code, {debug: options.debug ?? false});

		return {
			...result,
			duration_ms: Date.now() - start,
		};
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

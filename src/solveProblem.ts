import {generate, type GenerateOptions} from './generate.ts';
import {type RunPhase} from './run-phase.ts';
import {runProblem} from './runner.ts';
import {type Problem, type Result} from './types.ts';

export type SolveProblemOptions = GenerateOptions & {
	onPhaseChange?: (phase: RunPhase) => void;
	storeThinking?: boolean;
};

export const solveProblem = async (problem: Problem, options: SolveProblemOptions): Promise<Result> => {
	const start = Date.now();
	let thinking = '';
	const shouldStoreThinking = options.storeThinking ?? true;
	const onThinkingDelta: ((thinkingDelta: string) => void) | undefined = shouldStoreThinking
		? (thinkingDelta: string): void => {
				thinking += thinkingDelta;
			}
		: undefined;

	try {
		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange('thinking');
		}
		// oxlint-disable-next-line no-await-in-loop
		const code = await generate(problem, {
			...options,
			...(typeof onThinkingDelta === 'function' ? {onThinkingDelta} : {}),
		});

		if (typeof options.onPhaseChange === 'function') {
			options.onPhaseChange('testing');
		}
		// oxlint-disable-next-line no-await-in-loop
		const result = await runProblem(problem, code, {debug: options.debug ?? false});

		return {
			...result,
			...(shouldStoreThinking && thinking.length > 0 ? {thinking} : {}),
			duration_ms: Date.now() - start,
		};
	} catch (error) {
		const errorText = error instanceof Error ? error.message : String(error);

		return {
			problem: problem.name,
			category: problem.category,
			...(shouldStoreThinking && thinking.length > 0 ? {thinking} : {}),
			passed: false,
			error: errorText,
			duration_ms: Date.now() - start,
		};
	}
};

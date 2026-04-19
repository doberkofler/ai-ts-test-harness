import {startVitest} from 'vitest/node';
import {parseCategoryFilter, selectProblemsByFilters} from './core/problem-selection.ts';
import {clearLiveLine, replaceLiveLine, supportsLiveLine, writeLiveLine} from './core/tty-live-line.ts';
import {loadProblems} from './load-problems.ts';
import {formatCompletedProblemLine, formatProblemDisplayName, formatProblemStartLine, formatRunningLiveLine} from './run-progress.ts';
import {runProblem} from './runner.ts';
import {type ChangedFilesArtifact, type Problem} from './types.ts';

const createInvalidSolution = (problem: Problem): ChangedFilesArtifact => {
	const [firstFile] = Array.isArray(problem.files) ? problem.files : [];
	return {
		kind: 'changed-files-v1',
		files: firstFile ? [{path: firstFile.path, content: 'export const __invalid_solution__ = true;\\n'}] : [],
	};
};

const formatFailure = (problemName: string, issue: string): string => `- ${problemName}: ${issue}`;

const hasSolution = (problem: Problem): problem is Problem & {solution: NonNullable<Problem['solution']>} => typeof problem.solution !== 'undefined';

type ValidationStatus = 'passed' | 'failed' | 'missing-solution';

type ValidationTableRow = {
	problem: string;
	category: string;
	kind: 'workspace';
	status: ValidationStatus;
	details: string;
};

const VALIDATION_TABLE_COLUMNS: readonly (keyof ValidationTableRow)[] = ['problem', 'category', 'kind', 'status', 'details'];

const padCell = (value: string, width: number): string => value.padEnd(width, ' ');

const createHorizontalRule = (widths: readonly number[]): string => `+${widths.map((width) => '-'.repeat(width + 2)).join('+')}+`;

const createRow = (values: readonly string[], widths: readonly number[]): string => {
	const cells = values.map((value, index) => ` ${padCell(value, widths[index] ?? value.length)} `);
	return `|${cells.join('|')}|`;
};

const printValidationTable = (rows: readonly ValidationTableRow[]): void => {
	const headers = [...VALIDATION_TABLE_COLUMNS];
	const widths = headers.map((header) => {
		const widestCell = rows.reduce((max, row) => Math.max(max, row[header].length), header.length);
		return widestCell;
	});

	const horizontalRule = createHorizontalRule(widths);
	console.log(horizontalRule);
	console.log(createRow(headers, widths));
	console.log(horizontalRule);
	for (const row of rows) {
		const values = headers.map((header) => row[header]);
		console.log(createRow(values, widths));
	}
	console.log(horizontalRule);
};

const createProvidedSolution = (problem: Problem): ChangedFilesArtifact => {
	if (typeof problem.solution === 'undefined' || typeof problem.solution === 'function') {
		throw new TypeError(`Problem "${problem.name}" is missing a solution artifact`);
	}

	return problem.solution;
};

export type ValidateCommandOptions = {
	test: string | undefined;
	category: string | undefined;
	debug: boolean;
	loadProblemsFn?: typeof loadProblems;
	runProblemFn?: typeof runProblem;
	stream?: NodeJS.WriteStream;
	log?: (message: string) => void;
	now?: () => number;
	setIntervalFn?: (callback: () => void, delayMs: number) => ReturnType<typeof setInterval>;
	clearIntervalFn?: (timerId: ReturnType<typeof setInterval>) => void;
};

export const validateCommand = async (options: ValidateCommandOptions): Promise<void> => {
	const stream = options.stream ?? process.stdout;
	const log = options.log ?? console.log;
	const now = options.now ?? Date.now;
	const setIntervalFn = options.setIntervalFn ?? setInterval;
	const clearIntervalFn = options.clearIntervalFn ?? clearInterval;
	const preferUnicode = stream.isTTY;
	const showLiveTimer = supportsLiveLine(stream) && !options.debug;

	const allProblems = (options.loadProblemsFn ?? loadProblems)('./src/problems');
	const selectedCategories = parseCategoryFilter(options.category);
	const selectedProblems = selectProblemsByFilters(allProblems, options.test, selectedCategories);
	const solvedProblems = selectedProblems.filter((problem): problem is Problem & {solution: NonNullable<Problem['solution']>} => hasSolution(problem));
	const solvedCount = solvedProblems.length;
	const validationTable: ValidationTableRow[] = selectedProblems.map((problem) => ({
		problem: problem.name,
		category: problem.category,
		kind: 'workspace',
		status: hasSolution(problem) ? 'passed' : 'missing-solution',
		details: hasSolution(problem) ? 'Validation pending' : 'No solution provided yet',
	}));

	let checks = 0;
	const failures: string[] = [];

	for (const [index, problem] of solvedProblems.entries()) {
		const problemDisplayName = formatProblemDisplayName(problem.category, problem.name);
		if (!showLiveTimer) {
			log(formatProblemStartLine(index, solvedProblems.length, problemDisplayName));
		}

		const startedAtMs = now();
		let timerId: ReturnType<typeof setInterval> | undefined;
		if (showLiveTimer) {
			writeLiveLine(stream, formatRunningLiveLine(problemDisplayName, 0));
			timerId = setIntervalFn(() => {
				replaceLiveLine(stream, formatRunningLiveLine(problemDisplayName, now() - startedAtMs));
			}, 1000);
		}

		const solution = createProvidedSolution(problem);
		const tableRow = validationTable.find((row) => row.problem === problem.name);
		if (typeof tableRow === 'undefined') {
			throw new TypeError(`Unable to find validation row for problem "${problem.name}"`);
		}

		const issueMessages: string[] = [];
		let totalDurationMs = 0;
		try {
			checks += 1;
			const providedSolutionStartedAtMs = now();
			// oxlint-disable-next-line no-await-in-loop
			const solutionResult = await (options.runProblemFn ?? runProblem)(problem, solution, {
				debug: options.debug,
				startVitest,
			});
			totalDurationMs += Math.max(0, now() - providedSolutionStartedAtMs);
			if (!solutionResult.passed) {
				const issue = `provided solution failed tests (${solutionResult.error ?? 'unknown error'})`;
				failures.push(formatFailure(problem.name, issue));
				issueMessages.push(issue);
			}

			checks += 1;
			const invalidSolutionStartedAtMs = now();
			// oxlint-disable-next-line no-await-in-loop
			const invalidResult = await (options.runProblemFn ?? runProblem)(problem, createInvalidSolution(problem), {
				debug: options.debug,
				startVitest,
			});
			totalDurationMs += Math.max(0, now() - invalidSolutionStartedAtMs);
			if (invalidResult.passed) {
				const issue = 'tests accepted an intentionally invalid solution';
				failures.push(formatFailure(problem.name, issue));
				issueMessages.push(issue);
			}
		} finally {
			if (typeof timerId !== 'undefined') {
				clearIntervalFn(timerId);
				clearLiveLine(stream);
			}
		}

		tableRow.status = issueMessages.length === 0 ? 'passed' : 'failed';
		tableRow.details = issueMessages.length === 0 ? '' : issueMessages.join('; ');

		log(
			formatCompletedProblemLine({
				index,
				total: solvedProblems.length,
				name: problemDisplayName,
				passed: issueMessages.length === 0,
				durationMs: Math.max(totalDurationMs, now() - startedAtMs),
				preferUnicode,
			}),
		);
	}

	printValidationTable(validationTable);

	if (failures.length > 0) {
		throw new Error(`Problem validation failed:\n${failures.join('\n')}`);
	}

	process.exitCode = 0;
	console.log(`Validation passed for ${solvedCount}/${selectedProblems.length} problems with solutions (${checks} checks).`);
};

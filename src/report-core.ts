import {type ResultsFile} from './types.ts';

export type RunReportEntry = {
	jsonPath: string;
	htmlPath: string;
	payload: ResultsFile;
};

export const escapeJsonForHtmlScript = (value: unknown): string =>
	JSON.stringify(value)
		.replaceAll('<', String.raw`\u003c`)
		.replaceAll('>', String.raw`\u003e`)
		.replaceAll('&', String.raw`\u0026`);

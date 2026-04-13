import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';
import {type Problem} from './types.ts';

const rawDefinitionSchema = z
	.object({
		kind: z.enum(['implement-function', 'direct-refactor']).default('implement-function'),
		category: z.string().min(1, 'problems must include a category section'),
		description: z.array(z.string().min(1)).min(1),
		tests: z.string().min(1),
		signature: z.string().min(1).optional(),
		input: z.string().min(1).optional(),
	})
	.superRefine((value, context) => {
		if (value.kind === 'implement-function' && typeof value.signature !== 'string') {
			context.addIssue({
				code: 'custom',
				message: 'implement-function problems must include a signature section',
				path: ['signature'],
			});
		}

		if (value.kind === 'direct-refactor' && typeof value.input !== 'string') {
			context.addIssue({
				code: 'custom',
				message: 'direct-refactor problems must include an input section',
				path: ['input'],
			});
		}
	});

const stripFence = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed.startsWith('```') || !trimmed.endsWith('```')) {
		return trimmed;
	}

	const firstBreak = trimmed.indexOf('\n');
	if (firstBreak === -1) {
		return '';
	}

	const lastFence = trimmed.lastIndexOf('\n```');
	if (lastFence <= firstBreak) {
		return '';
	}

	const content = trimmed.slice(firstBreak + 1, lastFence);
	return content.trim();
};

const normalizeDescription = (value: string): string[] =>
	value
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => line.replace(/^[-*]\s+/, ''));

const normalizeCategory = (value: string): string => value.trim().toLowerCase();

const parseSections = (markdown: string): Record<string, string> => {
	const sections: Record<string, string> = {};
	const lines = markdown.split('\n');

	const currentSection: {name: string | undefined; lines: string[]} = {
		name: undefined,
		lines: [],
	};

	const flushSection = (): void => {
		if (typeof currentSection.name !== 'string') {
			return;
		}

		sections[currentSection.name] = currentSection.lines.join('\n').trim();
	};

	for (const line of lines) {
		const isHeading = line.startsWith('## ') || line.startsWith('##\t');
		if (isHeading) {
			flushSection();
			currentSection.name = line.slice(2).trim().toLowerCase();
			currentSection.lines = [];
			continue;
		}

		if (typeof currentSection.name === 'string') {
			currentSection.lines.push(line);
		}
	}

	flushSection();
	return sections;
};

const parseNameFromPath = (filePath: string): string => {
	const fileName = filePath.split('/').at(-1);
	if (typeof fileName !== 'string' || !fileName.endsWith('.md')) {
		throw new TypeError(`Invalid problem file path: ${filePath}`);
	}

	const withoutExtension = fileName.slice(0, -3);
	const withoutPrefix = withoutExtension.replace(/^\d+[-_\s]*/, '');
	if (withoutPrefix.length === 0) {
		throw new TypeError(`Unable to derive problem name from file path: ${filePath}`);
	}

	return withoutPrefix;
};

export const parseProblemDefinition = (filePath: string, markdown: string): Problem => {
	const sections = parseSections(markdown);
	const {signature, input} = sections;
	const parsed = rawDefinitionSchema.parse({
		kind: sections['kind'],
		category: normalizeCategory(sections['category'] ?? ''),
		description: normalizeDescription(sections['description'] ?? ''),
		tests: stripFence(sections['tests'] ?? ''),
		signature: typeof signature === 'string' && signature.length > 0 ? stripFence(signature) : undefined,
		input: typeof input === 'string' && input.length > 0 ? stripFence(input) : undefined,
	});

	const name = parseNameFromPath(filePath);
	if (parsed.kind === 'direct-refactor') {
		if (typeof parsed.input !== 'string') {
			throw new TypeError(`Problem ${name} is missing input code`);
		}

		return {
			name,
			category: parsed.category,
			kind: 'direct-refactor',
			description: parsed.description,
			input: parsed.input,
			tests: parsed.tests,
		};
	}

	if (typeof parsed.signature !== 'string') {
		throw new TypeError(`Problem ${name} is missing a signature`);
	}

	return {
		name,
		category: parsed.category,
		kind: 'implement-function',
		description: parsed.description,
		signature: parsed.signature,
		tests: parsed.tests,
	};
};

export const loadProblems = (dir: string): Problem[] => {
	const entries = readdirSync(dir, {withFileTypes: true})
		.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
		.map((entry) => entry.name)
		.sort((leftName, rightName) => leftName.localeCompare(rightName));

	return entries.map((fileName) => {
		const filePath = join(dir, fileName);
		const markdown = readFileSync(filePath, 'utf8');
		return parseProblemDefinition(filePath, markdown);
	});
};

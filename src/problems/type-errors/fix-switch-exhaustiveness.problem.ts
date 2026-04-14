import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-switch-exhaustiveness',
	category: 'type-errors',
	description: 'Fix non-exhaustive switch over a union by handling all cases with a never check.',
	input: [
		"type Status = 'idle' | 'loading' | 'done';",
		'',
		'export function statusLabel(status: Status): string {',
		'\tswitch (status) {',
		"\t\tcase 'idle':",
		"\t\t\treturn 'Idle';",
		"\t\tcase 'loading':",
		"\t\t\treturn 'Loading...';",
		'\t\tdefault:',
		"\t\t\treturn '';",
		'\t}',
		'}',
	].join('\n'),
	entry: 'statusLabel',
	solution: () =>
		[
			"type Status = 'idle' | 'loading' | 'done';",
			'',
			'const assertNever = (value: never): never => {',
			['\tthrow new Error(`Unexpected status: ', String.fromCodePoint(36), '{String(value)}`);'].join(''),
			'};',
			'',
			'export function statusLabel(status: Status): string {',
			'\tswitch (status) {',
			"\t\tcase 'idle':",
			"\t\t\treturn 'Idle';",
			"\t\tcase 'loading':",
			"\t\t\treturn 'Loading...';",
			"\t\tcase 'done':",
			"\t\t\treturn 'Done';",
			'\t\tdefault:',
			'\t\t\treturn assertNever(status);',
			'\t}',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed('idle'), 'Idle');
		assert.strictEqual(transformed('loading'), 'Loading...');
		assert.strictEqual(transformed('done'), 'Done');
		assert.match(code.result, /assertNever\s*=\s*\(value:\s*never\)/);
		assert.match(code.result, /case\s+'done'/);
	},
});

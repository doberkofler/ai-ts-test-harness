import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-excess-property',
	description: ["Fix object literal excess property error for field 'extra'.", 'Return a Config with only host and port.'],
	input: [
		'type Config = {',
		'\thost: string;',
		'\tport: number;',
		'};',
		'',
		'export function getConfig(): Config {',
		"\treturn {host: 'localhost', port: 3000, extra: true};",
		'}',
	].join('\n'),
	entry: 'getConfig',
	solution: () =>
		[
			'type Config = {',
			'\thost: string;',
			'\tport: number;',
			'};',
			'',
			'export function getConfig(): Config {',
			"\treturn {host: 'localhost', port: 3000};",
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.deepStrictEqual(transformed(), {host: 'localhost', port: 3000});
		assert.doesNotMatch(code.result, /\bextra\b/, 'extra property must be removed');
	},
});

import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-typo-method',
	category: 'type-errors',
	description: ["Fix Property 'toUppercase' does not exist on type 'string'.", 'Preserve behavior and function signature.'],
	input: ['export function shout(message: string): string {', '\treturn message.toUppercase();', '}'].join('\n'),
	entry: 'shout',
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed('hello'), 'HELLO');
		assert.strictEqual(transformed(''), '');
		assert.match(code.result, /toUpperCase\s*\(/, 'correct method should be used');
		assert.doesNotMatch(code.result, /toUppercase\s*\(/, 'typo must be removed');
	},
});

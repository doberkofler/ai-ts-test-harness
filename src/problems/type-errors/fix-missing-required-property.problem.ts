import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-missing-required-property',
	category: 'type-errors',
	description: ["Fix missing required property 'age' in returned User object.", 'Keep name and include a numeric age default.'],
	input: ['type User = {', '\tname: string;', '\tage: number;', '};', '', 'export function createUser(): User {', "\treturn {name: 'Alice'};", '}'].join('\n'),
	entry: 'createUser',
	tests: [
		'const user = (transformed as () => {name: string; age: number})();',
		"assert.strictEqual(user.name, 'Alice');",
		"assert.strictEqual(typeof user.age, 'number');",
		String.raw`assert.match(code.result, /age\s*:/, 'age property should exist');`,
	].join('\n'),
});

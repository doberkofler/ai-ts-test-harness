import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-missing-required-property',
	description: ["Fix missing required property 'age' in returned User object.", 'Keep name and include a numeric age default.'],
	input: ['type User = {', '\tname: string;', '\tage: number;', '};', '', 'export function createUser(): User {', "\treturn {name: 'Alice'};", '}'].join('\n'),
	entry: 'createUser',
	solution: () =>
		['type User = {', '\tname: string;', '\tage: number;', '};', '', 'export function createUser(): User {', "\treturn {name: 'Alice', age: 30};", '}'].join(
			'\n',
		),
	tests: ({assert, transformed, code}) => {
		const user = transformed();
		if (typeof user !== 'object' || user === null) {
			throw new TypeError('expected createUser() to return an object');
		}

		assert.strictEqual(Reflect.get(user, 'name'), 'Alice');
		assert.strictEqual(typeof Reflect.get(user, 'age'), 'number');
		assert.match(code.result, /age\s*:/, 'age property should exist');
	},
});

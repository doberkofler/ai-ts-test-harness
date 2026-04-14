import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-keyof-indexing',
	category: 'type-errors',
	description: 'Fix unsafe generic indexing by constraining key to keyof T.',
	input: ['export function getProp<T>(value: T, key: string) {', '	return value[key];', '}'].join('\n'),
	entry: 'getProp',
	solution: () => ['export function getProp<T, K extends keyof T>(value: T, key: K): T[K] {', '\treturn value[key];', '}'].join('\n'),
	tests: ({assert, transformed, code}) => {
		const user = {id: '42', active: true};
		assert.strictEqual(transformed(user, 'id'), '42');
		assert.strictEqual(transformed(user, 'active'), true);
		assert.match(code.result, /K\s+extends\s+keyof\s+T/);
		assert.match(code.result, /:\s*T\[K\]/);
	},
});

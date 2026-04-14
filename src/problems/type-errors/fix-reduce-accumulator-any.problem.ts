import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-reduce-accumulator-any',
	category: 'type-errors',
	description: 'Fix reduce accumulator typing by returning a strongly typed record.',
	input: [
		'type Item = {id: string; count: number};',
		'',
		'export function toCountMap(items: Item[]) {',
		'\treturn items.reduce((acc, item) => {',
		'\t\tacc[item.id] = item.count;',
		'\t\treturn acc;',
		'\t}, {});',
		'}',
	].join('\n'),
	entry: 'toCountMap',
	solution: () =>
		[
			'type Item = {id: string; count: number};',
			'',
			'export function toCountMap(items: Item[]): Record<string, number> {',
			'\treturn items.reduce<Record<string, number>>((acc, item) => {',
			'\t\tacc[item.id] = item.count;',
			'\t\treturn acc;',
			'\t}, {});',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.deepStrictEqual(
			transformed([
				{id: 'a', count: 2},
				{id: 'b', count: 5},
			]),
			{a: 2, b: 5},
		);
		assert.match(code.result, /reduce<\s*Record<string,\s*number>\s*>/);
		assert.match(code.result, /Record<string,\s*number>/);
	},
});

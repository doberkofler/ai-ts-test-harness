import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-discriminated-union-branch',
	description: 'Fix incorrect property access in discriminated union branches.',
	input: [
		'type UserEvent = {type: "user"; userId: string};',
		'type PaymentEvent = {type: "payment"; amount: number};',
		'type Event = UserEvent | PaymentEvent;',
		'',
		'export function eventLabel(event: Event): string {',
		"\tif (event.type === 'user') {",
		['\t\treturn `payment:', String.fromCodePoint(36), '{event.amount}`;'].join(''),
		'\t}',
		['\treturn `user:', String.fromCodePoint(36), '{event.userId}`;'].join(''),
		'}',
	].join('\n'),
	entry: 'eventLabel',
	solution: () =>
		[
			'type UserEvent = {type: "user"; userId: string};',
			'type PaymentEvent = {type: "payment"; amount: number};',
			'type Event = UserEvent | PaymentEvent;',
			'',
			'export function eventLabel(event: Event): string {',
			"\tif (event.type === 'user') {",
			['\t\treturn `user:', String.fromCodePoint(36), '{event.userId}`;'].join(''),
			'\t}',
			['\treturn `payment:', String.fromCodePoint(36), '{event.amount}`;'].join(''),
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		assert.strictEqual(transformed({type: 'user', userId: 'u1'}), 'user:u1');
		assert.strictEqual(transformed({type: 'payment', amount: 42}), 'payment:42');
		assert.match(code.result, /event\.type\s*===\s*'user'/);
		assert.match(code.result, /event\.userId/);
		assert.match(code.result, /event\.amount/);
	},
});

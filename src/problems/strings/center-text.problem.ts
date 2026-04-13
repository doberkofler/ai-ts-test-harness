import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'center-text',
	category: 'strings',
	description: [
		'Center a string within a field of the given width using spaces.',
		'If the padding is odd, the extra space goes to the right.',
		'If the string is >= width, return it unchanged.',
	],
	signature: 'function centerText(text: string, width: number): string',
	tests: [
		"assert.strictEqual(centerText('hi', 6), '  hi  ');",
		"assert.strictEqual(centerText('hello', 9), '  hello  ');",
		"assert.strictEqual(centerText('hi', 5), ' hi  ');",
		"assert.strictEqual(centerText('a', 5), '  a  ');",
		"assert.strictEqual(centerText('hello', 5), 'hello');",
		"assert.strictEqual(centerText('hello', 3), 'hello');",
		"assert.strictEqual(centerText('', 4), '    ');",
	].join('\n'),
});

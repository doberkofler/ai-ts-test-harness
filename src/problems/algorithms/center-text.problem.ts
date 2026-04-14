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
	solution: function centerText(text: string, width: number): string {
		if (text.length >= width) {
			return text;
		}

		const totalPadding = width - text.length;
		const leftPadding = Math.floor(totalPadding / 2);
		const rightPadding = totalPadding - leftPadding;
		return `${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}`;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(implementation('hi', 6), '  hi  ');
		assert.strictEqual(implementation('hello', 9), '  hello  ');
		assert.strictEqual(implementation('hi', 5), ' hi  ');
		assert.strictEqual(implementation('a', 5), '  a  ');
		assert.strictEqual(implementation('hello', 5), 'hello');
		assert.strictEqual(implementation('hello', 3), 'hello');
		assert.strictEqual(implementation('', 4), '    ');
	},
});

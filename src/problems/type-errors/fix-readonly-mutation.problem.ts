import {defineRefactorProblem} from '#problem-api';

export default defineRefactorProblem({
	name: 'fix-readonly-mutation',
	category: 'type-errors',
	description: ['Fix mutation of readonly array in Cart.', 'Return a new Cart value without mutating the original input.'],
	input: [
		'type Cart = {',
		'\treadonly items: readonly string[];',
		'};',
		'',
		'export function addItem(cart: Cart, item: string): Cart {',
		'\tcart.items.push(item);',
		'\treturn cart;',
		'}',
	].join('\n'),
	entry: 'addItem',
	tests: [
		"const originalCart = {items: Object.freeze(['apple']) as readonly string[]};",
		"const result = (transformed as (cart: {readonly items: readonly string[]}, item: string) => {readonly items: readonly string[]})(originalCart, 'banana');",
		"assert.deepStrictEqual(result.items, ['apple', 'banana']);",
		"assert.deepStrictEqual(originalCart.items, ['apple']);",
		String.raw`assert.doesNotMatch(code.result, /\.push\s*\(/, 'push mutation should not be used');`,
	].join('\n'),
});

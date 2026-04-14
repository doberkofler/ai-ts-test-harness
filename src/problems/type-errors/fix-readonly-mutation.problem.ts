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
	solution: () =>
		[
			'type Cart = {',
			'\treadonly items: readonly string[];',
			'};',
			'',
			'export function addItem(cart: Cart, item: string): Cart {',
			'\treturn {items: [...cart.items, item]};',
			'}',
		].join('\n'),
	tests: ({assert, transformed, code}) => {
		const originalCart = {items: Object.freeze(['apple'])};
		const result = transformed(originalCart, 'banana');
		if (typeof result !== 'object' || result === null) {
			throw new TypeError('expected addItem() to return an object');
		}

		assert.deepStrictEqual(Reflect.get(result, 'items'), ['apple', 'banana']);
		assert.deepStrictEqual(originalCart.items, ['apple']);
		assert.doesNotMatch(code.result, /\.push\s*\(/, 'push mutation should not be used');
	},
});

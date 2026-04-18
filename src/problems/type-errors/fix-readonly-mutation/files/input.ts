type Cart = {
	readonly items: readonly string[];
};

export function addItem(cart: Cart, item: string): Cart {
	cart.items.push(item);
	return cart;
}

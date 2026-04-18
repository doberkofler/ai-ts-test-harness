export function firstUpper(items: string[]): string {
	if (items.length === 0) {
		throw new Error('items must not be empty');
	}
	return items[0].toUpperCase();
}

type Item = {id: string; count: number};

export function toCountMap(items: Item[]): Record<string, number> {
	return items.reduce<Record<string, number>>((acc, item) => {
		acc[item.id] = item.count;
		return acc;
	}, {});
}

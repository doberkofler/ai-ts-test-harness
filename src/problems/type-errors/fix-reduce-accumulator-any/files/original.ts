type Item = {id: string; count: number};

export function toCountMap(items: Item[]) {
	return items.reduce((acc, item) => {
		acc[item.id] = item.count;
		return acc;
	}, {});
}

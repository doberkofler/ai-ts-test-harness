async function* paginate<T>(
	fetcher: (page: number) => Promise<{items: T[]; hasMore: boolean}>,
	startPage = 1,
): AsyncGenerator<T, void, undefined> {
	let page = startPage;
	while (true) {
		const {items, hasMore} = await fetcher(page);
		for (const item of items) {
			yield item;
		}
		if (!hasMore) {
			break;
		}
		page++;
	}
}

export {paginate};

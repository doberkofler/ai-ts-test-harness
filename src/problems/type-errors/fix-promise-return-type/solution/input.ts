const fetchCount = async (): Promise<string> => Promise.resolve("123");

export async function getCount(): Promise<number> {
	const raw = await fetchCount();
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) {
		throw new Error('count is not numeric');
	}
	return parsed;
}

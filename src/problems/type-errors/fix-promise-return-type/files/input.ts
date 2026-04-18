const fetchCount = async (): Promise<string> => Promise.resolve("123");

export async function getCount(): Promise<number> {
	return fetchCount();
}

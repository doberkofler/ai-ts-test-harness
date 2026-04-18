const fetchData = async (id: string): Promise<string> => {
	if (id === 'bad') {
		throw new Error('boom');
	}
	return `ok:${id}`;
};

export async function loadData(id: string): Promise<string> {
	try {
		return fetchData(id);
	} catch (error) {
		return `failed:${String(error)}`;
	}
}

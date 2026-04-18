export async function collectResults(tasks: Array<() => Promise<number>>): Promise<number[]> {
	const values = await Promise.all(tasks.map((task) => task()));
	return values;
}

export async function collectResults(tasks: Array<() => Promise<number>>): Promise<number[]> {
	const settled = await Promise.allSettled(tasks.map((task) => task()));
	return settled.filter((result): result is PromiseFulfilledResult<number> => result.status === 'fulfilled').map((result) => result.value);
}

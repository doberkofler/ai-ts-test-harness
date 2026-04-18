export function selectAllowed(items: string[], allowed: string[]): string[] {
	const result: string[] = [];
	for (const item of items) {
		if (allowed.includes(item)) {
			result.push(item);
		}
	}
	return result;
}

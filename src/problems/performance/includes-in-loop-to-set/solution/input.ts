export function selectAllowed(items: string[], allowed: string[]): string[] {
	const allowedSet = new Set(allowed);
	const result: string[] = [];
	for (const item of items) {
		if (allowedSet.has(item)) {
			result.push(item);
		}
	}
	return result;
}

export function readName(payload: unknown): string {
	if (typeof payload !== 'object' || payload === null || !('name' in payload)) {
		throw new Error('payload.name must be a string');
	}
	const name = payload['name'];
	if (typeof name !== 'string') {
		throw new Error('payload.name must be a string');
	}
	return name.trim();
}

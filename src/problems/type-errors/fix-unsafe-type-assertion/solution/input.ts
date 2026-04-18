export function upperUserId(payload: unknown): string {
	if (typeof payload !== 'object' || payload === null || !('id' in payload)) {
		throw new Error('payload.id must be a string');
	}
	const id = payload['id'];
	if (typeof id !== 'string') {
		throw new Error('payload.id must be a string');
	}
	return id.toUpperCase();
}
